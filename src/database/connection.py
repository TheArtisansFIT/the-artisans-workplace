import os
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from bson.codec_options import CodecOptions
from datetime import timezone

client = MongoClient(
    os.getenv("MONGODB_URI") or os.getenv("MONGO_URI"),
    server_api=ServerApi("1")
)

codec_options = CodecOptions(tz_aware=True, tzinfo=timezone.utc)

db = client[os.getenv("MONGO_DB_NAME", "splitnest")].with_options(
    codec_options=codec_options
)

def ping_server():
    try:
        client.admin.command("ping")
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print("Failed to connect to MongoDB.")
        raise e
