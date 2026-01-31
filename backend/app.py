from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os
import json
import uuid
from datetime import datetime, timedelta, timezone

app = Flask(__name__)

# ===== ENV =====
SECRET_KEY = os.environ.get("SECRET_KEY", "change_me_now")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "").strip()

ADMIN_ID = os.environ.get("ADMIN_ID", "admin@examia.com").strip()
ADMIN_PASS = os.environ.get("ADMIN_PASS", "Admin@123").strip()

# ===== CORS =====
if FRONTEND_ORIGIN:
    CORS(app, resources={r"/api/*": {"origins": [FRONTEND_ORIGIN]}})
else:
    CORS(app, resources={r"/api/*": {"origins": "*"}})

# ===== FILE STORAGE =====
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(DATA_DIR, "users.json")
PYQS_FILE = os.path.join(DATA_DIR, "pyqs.json")


def _read_json(path, default):
    try:
        if not os.path.exists(path):
            with open(path, "w", encoding="utf-8") as f:
                json.dump(default, f, ensure_ascii=False, indent=2)
            return default
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def _write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def ensure_files():
    _read_json(USERS_FILE, [])
    _read_json(PYQS_FILE, [])


def ensure_env_admin():
    """
    Always ensure the env-admin exists and is admin.
    If exists, update password hash to env value.
    """
    users = _read_json(USERS_FILE, [])
    admin_norm = ADMIN_ID.strip().lower()

    for u in users:
        if u.get("role") == "admin" and u.get("email", "").strip().lower() == admin_norm:
            u["password_hash"] = generate_password_hash(ADMIN_PASS)
            u["updated_at"] = _now_iso()
            _write_json(USERS_FILE, users)
            return

    # Create env admin (even if some other admin exists)
    users.append({
        "id": str(uuid.uuid4()),
        "name": "Admin",
        "email": ADMIN_ID.strip(),
        "password_hash": generate_password_hash(ADMIN_PASS),
        "role": "admin",
        "created_at": _now_iso()
    })
    _write_json(USERS_FILE, users)


def make_token(user):
    payload = {
        "sub": user["id"],
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def verify_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, ("Missing or invalid Authorization header", 401)

    token = auth.split(" ", 1)[1].strip()
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded, None
    except jwt.ExpiredSignatureError:
        return None, ("Token expired", 401)
    except Exception:
        return None, ("Invalid token", 401)


def require_admin(decoded):
    if not decoded or decoded.get("role") != "admin":
        return ("Admin access required", 403)
    return None


# ===== INIT =====
ensure_files()
ensure_env_admin()


@app.get("/")
def root():
    return jsonify({"message": "Examia API is running. Use /api/* endpoints."})


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "message": "Backend is running"})


@app.post("/api/auth/signup")
def signup():
    body = request.get_json(force=True, silent=True) or {}
    name = str(body.get("name", "")).strip()
    email = str(body.get("email", "")).strip()
    password = str(body.get("password", "")).strip()

    if not name or not email or not password:
        return jsonify({"error": "name, email, password are required"}), 400

    users = _read_json(USERS_FILE, [])
    email_norm = email.lower().strip()

    if any(u.get("email", "").lower().strip() == email_norm for u in users):
        return jsonify({"error": "Email already registered"}), 409

    new_user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email.strip(),
        "password_hash": generate_password_hash(password),
        "role": "user",
        "created_at": _now_iso()
    }
    users.append(new_user)
    _write_json(USERS_FILE, users)

    token = make_token(new_user)
    return jsonify({"message": "Signup successful", "token": token, "role": "user", "name": name})


@app.post("/api/auth/login")
def login():
    body = request.get_json(force=True, silent=True) or {}
    identifier = str(body.get("email", "")).strip()
    password = str(body.get("password", "")).strip()

    if not identifier or not password:
        return jsonify({"error": "email and password are required"}), 400

    # Ensure env admin exists/updated
    ensure_env_admin()

    users = _read_json(USERS_FILE, [])
    ident_norm = identifier.lower().strip()
    admin_norm = ADMIN_ID.lower().strip()

    # Admin login path
    if ident_norm == admin_norm:
        admin_user = next((u for u in users if u.get("email", "").lower().strip() == admin_norm and u.get("role") == "admin"), None)
        if not admin_user:
            return jsonify({"error": "Admin not initialized"}), 500

        if not check_password_hash(admin_user.get("password_hash", ""), password):
            return jsonify({"error": "Invalid email or password"}), 401

        admin_user["role"] = "admin"
        token = make_token(admin_user)
        return jsonify({"message": "Login successful", "token": token, "role": "admin", "name": admin_user.get("name", "Admin")})

    # Normal user login
    user = next((u for u in users if u.get("email", "").lower().strip() == ident_norm), None)
    if not user or not check_password_hash(user.get("password_hash", ""), password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = make_token(user)
    return jsonify({"message": "Login successful", "token": token, "role": user.get("role", "user"), "name": user.get("name", "")})


@app.get("/api/pyqs")
def list_pyqs():
    # LOGIN REQUIRED
    decoded, err = verify_token()
    if err:
        return jsonify({"error": err[0]}), err[1]

    items = _read_json(PYQS_FILE, [])

    exam = request.args.get("exam")
    year = request.args.get("year")
    subject = request.args.get("subject")
    chapter = request.args.get("chapter")
    qtype = request.args.get("type")

    def ok(x):
        if exam and x.get("exam") != exam: return False
        if year and x.get("year") != year: return False
        if subject and x.get("subject") != subject: return False
        if chapter and x.get("chapter") != chapter: return False
        if qtype and x.get("type") != qtype: return False
        return True

    filtered = [x for x in items if ok(x)]
    return jsonify({"count": len(filtered), "items": filtered})


@app.post("/api/admin/pyqs")
def add_pyq():
    decoded, err = verify_token()
    if err:
        return jsonify({"error": err[0]}), err[1]
    admin_err = require_admin(decoded)
    if admin_err:
        return jsonify({"error": admin_err[0]}), admin_err[1]

    body = request.get_json(force=True, silent=True) or {}
    required = ["exam", "year", "subject", "chapter", "question", "solution", "type"]
    for k in required:
        if k not in body or not str(body[k]).strip():
            return jsonify({"error": f"Missing field: {k}"}), 400

    items = _read_json(PYQS_FILE, [])
    new_item = {
        "id": str(uuid.uuid4()),
        "exam": str(body["exam"]).strip(),
        "year": str(body["year"]).strip(),
        "subject": str(body["subject"]).strip(),
        "chapter": str(body["chapter"]).strip(),
        "question": str(body["question"]).strip(),
        "solution": str(body["solution"]).strip(),
        "type": str(body["type"]).strip(),
        "created_at": _now_iso()
    }
    items.append(new_item)
    _write_json(PYQS_FILE, items)
    return jsonify({"message": "PYQ added", "item": new_item})


@app.delete("/api/admin/pyqs/<pyq_id>")
def delete_pyq(pyq_id):
    decoded, err = verify_token()
    if err:
        return jsonify({"error": err[0]}), err[1]
    admin_err = require_admin(decoded)
    if admin_err:
        return jsonify({"error": admin_err[0]}), admin_err[1]

    items = _read_json(PYQS_FILE, [])
    new_items = [x for x in items if x.get("id") != pyq_id]
    if len(new_items) == len(items):
        return jsonify({"error": "PYQ not found"}), 404

    _write_json(PYQS_FILE, new_items)
    return jsonify({"message": "PYQ deleted", "deleted_id": pyq_id})


# ✅ THIS IS THE MOST IMPORTANT PART FOR RENDER:
# Start server and bind to Render's PORT
if __name__ == "__main__":
    port = int(os.environ.get("PORT", "10000"))
    app.run(host="0.0.0.0", port=port)
