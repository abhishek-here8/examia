import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
DB_URL = os.environ.get("DATABASE_URL", "")

def pg_conn():
    if not DB_URL:
        raise RuntimeError("DATABASE_URL not set")
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

def init_users_table():
    conn = pg_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    conn.commit()
    cur.close()
    conn.close()

init_users_table()

app = Flask(__name__)

# ✅ CORS (Works for now)
# If you later set FRONTEND_ORIGIN in Render, it should be:
# https://abhishek-here8.github.io
raw_origin = os.environ.get("FRONTEND_ORIGIN", "*")
FRONTEND_ORIGIN = raw_origin.replace("\r", "").replace("\n", "").strip()
CORS(app, resources={r"/*": {"origins": FRONTEND_ORIGIN}})

# ✅ Secret key (set SECRET_KEY in Render env for permanence)
app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(32)

# ✅ Token signer
serializer = URLSafeTimedSerializer(app.secret_key)
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7  # 7 days

DATA_FILE = "pyqs.json"
USERS_FILE = "users.json"


# -------------------- FILE HELPERS --------------------
def read_pyqs():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_pyqs(items):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


def read_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)


# -------------------- AUTH HELPERS --------------------
def issue_token(payload: dict) -> str:
    return serializer.dumps(payload)


def read_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.replace("Bearer ", "").strip()
    try:
        data = serializer.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
        return data
    except (SignatureExpired, BadSignature):
        return None


def require_user_or_admin():
    data = read_token()
    if not data:
        return False
    return data.get("role") in ("user", "admin")


def require_admin():
    data = read_token()
    if not data:
        return False
    return data.get("role") == "admin"


# -------------------- ROUTES --------------------
@app.route("/auth/login", methods=["POST", "OPTIONS"])
def auth_login():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    conn = pg_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = secrets.token_urlsafe(32)
    USER_TOKENS[token] = email
    return jsonify({"message": "Login ok", "token": token})

USER_TOKENS = {}

@app.route("/auth/register", methods=["POST", "OPTIONS"])
def auth_register():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or "@" not in email:
        return jsonify({"error": "Valid email required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    pw_hash = generate_password_hash(password)

    try:
        conn = pg_conn()
        cur = conn.cursor()
        cur.execute("INSERT INTO users (email, password_hash) VALUES (%s, %s)", (email, pw_hash))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Registered successfully"})
    except Exception:
        # likely duplicate email
        return jsonify({"error": "Email already registered"}), 409
        
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Welcome to EXAMIA Backend"})


@app.route("/user/signup", methods=["POST", "OPTIONS"])
def user_signup():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(force=True) or {}
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    users = read_users()
    if any(u.get("email") == email for u in users):
        return jsonify({"error": "User already exists"}), 400

    users.append(
        {
            "email": email,
            "password": generate_password_hash(password),
        }
    )
    write_users(users)
    return jsonify({"message": "Signup successful"})


@app.route("/user/login", methods=["POST", "OPTIONS"])
def user_login():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(force=True) or {}
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")

    users = read_users()
    user = next((u for u in users if u.get("email") == email), None)

    if not user or not check_password_hash(user.get("password", ""), password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = issue_token({"role": "user", "email": email})
    return jsonify({"message": "Login ok", "token": token, "expires_in": TOKEN_MAX_AGE_SECONDS})


@app.route("/admin/login", methods=["POST", "OPTIONS"])
def admin_login():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(force=True) or {}

    admin_id = os.environ.get("ADMIN_ID", "")
    admin_pass = os.environ.get("ADMIN_PASS", "")
    admin_pass_hash = os.environ.get("ADMIN_PASS_HASH", "")

    if not admin_id:
        return jsonify({"error": "ADMIN_ID not configured on server"}), 500

    if body.get("id") != admin_id:
        return jsonify({"error": "Invalid credentials"}), 401

    password = body.get("password", "")

    # ✅ Prefer hashed password if set; else fallback to ADMIN_PASS
    if admin_pass_hash:
        if not check_password_hash(admin_pass_hash, password):
            return jsonify({"error": "Invalid credentials"}), 401
    else:
        if not admin_pass or password != admin_pass:
            return jsonify({"error": "Invalid credentials"}), 401

    token = issue_token({"role": "admin", "id": admin_id})
    return jsonify({"message": "Login ok", "token": token, "expires_in": TOKEN_MAX_AGE_SECONDS})


@app.route("/pyqs", methods=["GET", "OPTIONS"])
def pyqs():
    if request.method == "OPTIONS":
        return ("", 204)

    if not require_user_or_admin():
        return jsonify({"error": "Login required"}), 401

    items = read_pyqs()

    if not items:
        items = [
            {
                "exam": "JEE Main",
                "year": "2023",
                "subject": "Physics",
                "question": "If m = 2 kg and a = 5 m/s², find force.",
                "solution": "F = ma = 10 N",
            }
        ]
        write_pyqs(items)

    return jsonify(items)


@app.route("/add_pyq", methods=["POST", "OPTIONS"])
def add_pyq():
    if request.method == "OPTIONS":
        return ("", 204)

    if not require_admin():
        return jsonify({"error": "Unauthorized"}), 401

    body = request.get_json(force=True) or {}

    required = ["exam", "year", "subject", "question", "solution"]
    for k in required:
        if k not in body or not str(body[k]).strip():
            return jsonify({"error": f"Missing field: {k}"}), 400

    items = read_pyqs()
    items.append(
        {
            "exam": str(body["exam"]).strip(),
            "year": str(body["year"]).strip(),
            "subject": str(body["subject"]).strip(),
            "question": str(body["question"]).strip(),
            "solution": str(body["solution"]).strip(),
        }
    )
    write_pyqs(items)

    return jsonify({"message": "PYQ added", "count": len(items)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
