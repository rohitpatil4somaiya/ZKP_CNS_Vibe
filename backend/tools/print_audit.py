from pymongo import MongoClient
from dotenv import load_dotenv
import os
from pprint import pprint

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI')
DBNAME = os.getenv('MONGO_DBNAME', 'zkp_demo')
if not MONGO_URI:
    print('MONGO_URI not set in .env')
    exit(1)

client = MongoClient(MONGO_URI)
db = client.get_database(DBNAME)
cols = db.get_collection('audit_logs')
print('Last 30 audit logs:')
for doc in cols.find().sort('timestamp', -1).limit(30):
    pprint(doc)
