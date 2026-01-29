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
    conn = get_db_connection()
    pyqs = conn.execute("SELECT * FROM pyqs").fetchall()
    conn.close()
    return jsonify([dict(row) for row in pyqs])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
