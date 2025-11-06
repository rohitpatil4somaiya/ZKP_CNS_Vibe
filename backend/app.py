# app.py
"""
Main Flask entrypoint.
Run with:
  (venv) python app.py
"""

# app.py
from flask import Flask, jsonify
from flask_cors import CORS
from utils.db import db, users 
from routes.auth import auth_bp 

app = Flask(__name__)
CORS(app)  

app.register_blueprint(auth_bp)

@app.route("/")
def home():
    return "Flask backend running with MongoDB!"


if __name__ == "__main__":
    app.run(debug=True)
