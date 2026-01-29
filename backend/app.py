from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return jsonify({"message": "Welcome to EXAMIA Backend"})

@app.route("/pyqs")
def pyqs():
    sample = [
        {"exam": "JEE Main", "year": "2023", "subject": "Physics",
         "question": "If m = 2 kg and a = 5 m/s², find force.", "solution": "F = ma = 10 N"},

        {"exam": "JEE Main", "year": "2023", "subject": "Chemistry",
         "question": "What is the atomic number of Oxygen?", "solution": "8"},

        {"exam": "JEE Main", "year": "2023", "subject": "Maths",
         "question": "Derivative of x²?", "solution": "2x"}
    ]
    return jsonify(sample)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
