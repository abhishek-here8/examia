from flask import Flask, jsonify
import sqlite3

app = Flask(__name__)

def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route("/")
def home():
    return jsonify({"message": "Welcome to EXAMIA Backend"})

@app.route("/pyqs")
def pyqs():
    sample = [
        {"subject": "Physics", "question": "If m = 2 kg and a = 5 m/s², find force.", "solution": "F = ma = 10 N"},
        {"subject": "Chemistry", "question": "What is the atomic number of Oxygen?", "solution": "8"},
        {"subject": "Maths", "question": "Derivative of x²?", "solution": "2x"}
    ]
    return jsonify(sample)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
