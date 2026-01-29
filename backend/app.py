from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

DATA_FILE = "pyqs.json"


def read_pyqs():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def write_pyqs(items):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


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
            },
            {
                "exam": "JEE Main",
                "year": "2023",
                "subject": "Chemistry",
                "question": "What is the atomic number of Oxygen?",
                "solution": "8",
            },
            {
                "exam": "JEE Main",
                "year": "2023",
                "subject": "Maths",
                "question": "Derivative of x²?",
                "solution": "2x",
            },
        ]
        write_pyqs(items)

    return jsonify(items)


@app.route("/add_pyq", methods=["POST", "OPTIONS"])
def add_pyq():
    if request.method == "OPTIONS":
        return ("", 204)

    body = request.get_json(force=True)

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
