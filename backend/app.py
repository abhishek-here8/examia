from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
# Persistent secret key (set this in Render env: SECRET_KEY)
app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(32)

# Token signer for user login tokens
serializer = URLSafeTimedSerializer(app.secret_key)
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7  # 7 days

DATA_FILE = "pyqs.json"
USERS_FILE = "users.json"

def read_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def write_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

# In-memory token store (good enough for MVP).
# Note: tokens will reset if Render restarts.
ACTIVE_TOKENS = set()


def read_pyqs():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_pyqs(items):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


def require_auth():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return False
    token = auth.replace("Bearer ", "").strip()
    return token in ACTIVE_TOKENS


@app.route("/")
def home():
    return jsonify({"message": "Welcome to EXAMIA Backend"})


@app.route("/pyqs")
def pyqs():
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


@app.route("/admin/login", methods=["POST", "OPTIONS"])
def admin_login():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(force=True) or {}

    admin_id = os.environ.get("ADMIN_ID", "")
    admin_pass = os.environ.get("ADMIN_PASS", "")

    if not admin_id or not admin_pass:
        return jsonify({"error": "Admin credentials not configured on server"}), 500

    if body.get("id") != admin_id or body.get("password") != admin_pass:
        return jsonify({"error": "Invalid credentials"}), 401

    token = secrets.token_urlsafe(32)
    ACTIVE_TOKENS.add(token)
    return jsonify({"message": "Login ok", "token": token})


@app.route("/add_pyq", methods=["POST", "OPTIONS"])
def add_pyq():
    if request.method == "OPTIONS":
        return ("", 204)

    if not require_auth():
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

@app.route("/user/signup", methods=["POST"])
def user_signup():
    body = request.get_json(force=True) or {}

    email = body.get("email","").lower().strip()
    password = body.get("password","")

    if not email or not password:
        return jsonify({"error":"Email and password required"}), 400

    users = read_users()

    if any(u["email"] == email for u in users):
        return jsonify({"error":"User already exists"}), 400

    users.append({
        "email": email,
        "password": generate_password_hash(password)
    })

    write_users(users)

    return jsonify({"message":"Signup successful"})
    @app.route("/user/login", methods=["POST"])
def user_login():
    body = request.get_json(force=True) or {}

    email = body.get("email","").lower().strip()
    password = body.get("password","")

    users = read_users()
    user = next((u for u in users if u["email"] == email), None)

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error":"Invalid credentials"}), 401

    token = serializer.dumps({"role":"user","email":email})
    return jsonify({"token": token})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
