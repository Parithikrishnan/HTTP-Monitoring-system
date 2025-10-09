# mitm_mongo_logger.py (REFINED - Reduced Console Output)
import json
import re
from datetime import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId

# --- Configuration (Must match your server.js) ---
MONGODB_URI = "mongodb://127.0.0.1:27017"
DB_NAME = "trafficlogger"
COLLECTION_NAME = "httptrafficlogs"
PROXY_LISTEN_PORT = 8080 # Default mitmproxy port, ensure your client uses this

# --- MongoDB Connection ---
client = None
db_collection = None

def setup_mongo_connection():
    global client, db_collection
    try:
        client = MongoClient(MONGODB_URI)
        db_collection = client[DB_NAME][COLLECTION_NAME]
        print(f"mitmproxy logger connected to MongoDB: {MONGODB_URI}/{DB_NAME}/{COLLECTION_NAME}")
        # Consider creating indexes here for better performance on common query fields
        # Example: db_collection.create_index([("linkedRequestId", 1), ("direction", 1)])
        # Example: db_collection.create_index("timestamp")
    except Exception as e:
        print(f"mitmproxy logger ERROR connecting to MongoDB: {e}")
        # No sys.exit() here, mitmproxy should continue even if logging fails initially
        # but db_collection will remain None, preventing logging attempts.

def shutdown_mongo_connection():
    global client
    if client:
        client.close()
        print("mitmproxy logger disconnected from MongoDB.")

# --- Helper to clean headers ---
def clean_headers(headers):
    cleaned = {}
    for k, v in headers.items():
        key = k.decode('utf-8') if isinstance(k, bytes) else k
        value = v.decode('utf-8') if isinstance(v, bytes) else v
        if key.lower() == 'set-cookie':
            # Handle multiple Set-Cookie headers, which mitmproxy might combine or keep separate
            # Here we split by regex to correctly handle commas inside cookie values
            cleaned[key] = [item.strip() for item in re.split(r';\s*(?=[^;]*=)', value)]
            # Refined split, if the above still struggles with internal commas,
            # you might need to handle it differently or just store the raw string.
            # For simplicity, if it's a single combined string of set-cookie headers,
            # we'll just store it as a single string, and let Node.js split.
            # A more robust approach might be:
            # if isinstance(v, list): # If mitmproxy gives us a list of header values
            #    cleaned[key] = [item.decode('utf-8') for item in v]
            # else:
            #    cleaned[key] = value
        else:
            cleaned[key] = value
    return cleaned


class MongoTrafficLogger:
    def load(self, entry):
        setup_mongo_connection()

    def done(self):
        shutdown_mongo_connection()

    def response(self, flow):
        if db_collection is None:
            # MongoDB connection not active, suppress further errors for each flow
            return

        # --- Filtering (Highly recommended for performance and relevance) ---
        # Exclude internal mitmproxy requests or traffic to your logger itself
        if flow.request.pretty_host in ["mitm.it", f"localhost:{PROXY_LISTEN_PORT}", f"127.0.0.1:{PROXY_LISTEN_PORT}"]:
            return
        # You might want to filter out specific content types, e.g., images, CSS
        # if flow.response and 'content-type' in flow.response.headers:
        #     content_type = flow.response.headers['content-type'].decode('utf-8', errors='ignore').lower()
        #     if content_type.startswith(('image/', 'text/css', 'application/javascript')):
        #         return

        try:
            request_id = ObjectId()

            # --- Request Body Processing ---
            request_body = None
            if flow.request.content:
                try:
                    # Attempt to decode as UTF-8
                    decoded_body = flow.request.content.decode('utf-8', errors='replace')
                    # Check if it's JSON
                    if flow.request.headers.get("content-type", "").lower().startswith("application/json"):
                        request_body = json.loads(decoded_body)
                    else:
                        request_body = decoded_body # Store as plain string
                except (UnicodeDecodeError, json.JSONDecodeError):
                    request_body = flow.request.content.hex() # Fallback for binary or unparseable text

            request_doc = {
                "_id": request_id,
                "direction": "incoming_request",
                "timestamp": datetime.fromtimestamp(flow.request.timestamp_start),
                "method": flow.request.method,
                "url": flow.request.url,
                "http_version": flow.request.http_version,
                "headers": clean_headers(flow.request.headers),
                "body": request_body,
                "client_ip": flow.client_conn.peername[0],
                "client_port": flow.client_conn.peername[1],
                "server_ip": flow.server_conn.peername[0] if flow.server_conn else None,
                "server_port": flow.server_conn.peername[1] if flow.server_conn else None,
                "duration_ms": (flow.response.timestamp_end - flow.request.timestamp_start) * 1000,
            }
            db_collection.insert_one(request_doc)

            # --- Response Body Processing ---
            response_body = None
            if flow.response and flow.response.content:
                try:
                    decoded_body = flow.response.content.decode('utf-8', errors='replace')
                    if flow.response.headers.get("content-type", "").lower().startswith("application/json"):
                        response_body = json.loads(decoded_body)
                    else:
                        response_body = decoded_body
                except (UnicodeDecodeError, json.JSONDecodeError):
                    response_body = flow.response.content.hex()

            response_doc = {
                "direction": "outgoing_response",
                "linkedRequestId": request_id,
                "timestamp": datetime.fromtimestamp(flow.response.timestamp_end),
                "statusCode": flow.response.status_code,
                "http_version": flow.response.http_version,
                "headers": clean_headers(flow.response.headers),
                "body": response_body,
                "content_length": len(flow.response.content) if flow.response.content else 0,
            }
            db_collection.insert_one(response_doc)

            # print(f"Logged flow: {flow.request.method} {flow.request.pretty_url} (Status: {flow.response.status_code})")
            # Removed this line to prevent verbose logging

        except Exception as e:
            # Only print errors that prevent logging to MongoDB
            print(f"Error logging flow {flow.request.pretty_url} to MongoDB: {e}")

addons = [
    MongoTrafficLogger()
]