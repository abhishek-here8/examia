from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os
import json
import uuid
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# ===== SETTINGS =====
SECRET_KEY = os.environ.get("SECRET_KEY", "examia_super_secret_change_me")
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(DATA_DIR, "users.json")
PYQS_FILE = os.path.join(DATA_DIR, "pyqs.json")

# Create default admin if none exists
DEFAULT_ADMIN_EMAIL = "admin@examia.com"
DEFAULT_ADMIN_PASSWORD = "Admin@123"  # change later


# ===== HELPERS =====
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


def ensure_admin_exists():
    users = _read_json(USERS_FILE, [])
    admin_exists = any(u.get("role") == "admin" for u in users)

    if not admin_exists:
        users.append({
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": DEFAULT_ADMIN_EMAIL.lower().strip(),
            "password_hash": generate_password_hash(DEFAULT_ADMIN_PASSWORD),
            "role": "admin",
            "created_at": datetime.utcnow().isoformat()
        })
        _write_json(USERS_FILE, users)


def make_token(user):
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def verify_token(auth_header):
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, ("Missing or invalid Authorization header", 401)

    token = auth_header.split(" ", 1)[1].strip()
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
ensure_admin_exists()


# ===== ROUTES =====
@app.get("/api/health")
def health():
    return jsonify({"ok": True, "message": "Backend is running"})


@app.post("/api/auth/signup")
def signup():
    body = request.get_json(force=True, silent=True) or {}
    name = str(body.get("name", "")).strip()
    email = str(body.get("email", "")).lower().strip()
    password = str(body.get("password", "")).strip()

    if not name or not email or not password:
        return jsonify({"error": "name, email, password are required"}), 400

    users = _read_json(USERS_FILE, [])
    if any(u.get("email") == email for u in users):
        return jsonify({"error": "Email already registered"}), 409

    new_user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "role": "user",
        "created_at": datetime.utcnow().isoformat()
    }
    users.append(new_user)
    _write_json(USERS_FILE, users)

    token = make_token(new_user)
    return jsonify({"message": "Signup successful", "token": token, "role": "user"})


@app.post("/api/auth/login")
def login():
    body = request.get_json(force=True, silent=True) or {}
    email = str(body.get("email", "")).lower().strip()
    password = str(body.get("password", "")).strip()

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    users = _read_json(USERS_FILE, [])
    user = next((u for u in users if u.get("email") == email), None)
    if not user or not check_password_hash(user.get("password_hash", ""), password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = make_token(user)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "role": user.get("role", "user"),
        "name": user.get("name", "")
    })


@app.get("/api/pyqs")
def list_pyqs():
    items = _read_json(PYQS_FILE, [])
    # optional filters
    exam = request.args.get("exam")
    year = request.args.get("year")
    subject = request.args.get("subject")
    chapter = request.args.get("chapter")
    qtype = request.args.get("type")  # written / video

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
    decoded, err = verify_token(request.headers.get("Authorization"))
    if err: return jsonify({"error": err[0]}), err[1]
    admin_err = require_admin(decoded)
    if admin_err: return jsonify({"error": admin_err[0]}), admin_err[1]

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
        "type": str(body["type"]).strip(),  # written/video
        "created_at": datetime.utcnow().isoformat()
    }
    items.append(new_item)
    _write_json(PYQS_FILE, items)
    return jsonify({"message": "PYQ added", "item": new_item})


@app.delete("/api/admin/pyqs/<pyq_id>")
def delete_pyq(pyq_id):
    decoded, err = verify_token(request.headers.get("Authorization"))
    if err: return jsonify({"error": err[0]}), err[1]
    admin_err = require_admin(decoded)
    if admin_err: return jsonify({"error": admin_err[0]}), admin_err[1]

    items = _read_json(PYQS_FILE, [])
    new_items = [x for x in items if x.get("id") != pyq_id]
    if len(new_items) == len(items):
        return jsonify({"error": "PYQ not found"}), 404

    _write_json(PYQS_FILE, new_items)
    return jsonify({"message": "PYQ deleted", "deleted_id": pyq_id})


if __name__ == "__main__":
    # For local testing
    app.run(host="0.0.0.0", port=5000, debug=True)
