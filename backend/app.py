# app.py
"""Main Flask entrypoint.

Run with:
  (venv) python app.py
"""

from flask import Flask, jsonify
from flask_cors import CORS
from utils.db import db, users
from routes.auth import auth_bp
import os

app = Flask(__name__)

# Configure CORS using an environment variable so you can set the allowed
# frontend origins in the Azure settings without changing code. If
# `FRONTEND_ORIGINS` is not set, fallback to allowing all origins (useful
# for local testing). Provide a comma-separated list for multiple origins.
frontend_origins = os.environ.get("FRONTEND_ORIGINS", "").strip()
if frontend_origins:
  origins = [o.strip() for o in frontend_origins.split(",") if o.strip()]
  CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)
else:
  # No specific origins configured: allow all (default). In production it's
  # better to set FRONTEND_ORIGINS to the exact origin(s) of your frontend.
  CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

app.register_blueprint(auth_bp)


@app.route("/")
def home():
  return "Flask backend running with MongoDB!"


if __name__ == "__main__":
  # Use the PORT env var provided by the platform (e.g., Azure). Default to 5000.
  port = int(os.environ.get("PORT", 5000))
  app.run(host="0.0.0.0", port=port, debug=True)
