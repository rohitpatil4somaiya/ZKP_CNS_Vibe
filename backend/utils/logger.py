import logging
from datetime import datetime
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# Setup Python logger
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "audit.log")

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# Optional: Log to MongoDB for persistent audit
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client["zkp_demo"]
audit_collection = db["audit_logs"]

def log_event(event_type, username=None, details=None):
    """
    Logs security events both to file and MongoDB
    """
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,  
        "username": username,
        "details": details,
    }

    # Log to file
    log_text = f"[{event_type}] user={username}, details={details}"
    logging.info(log_text)

    # log to MongoDB too
    audit_collection.insert_one(entry)