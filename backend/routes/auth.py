# routes/auth.py
from utils.logger import log_event
import psutil

import secrets
from flask import Blueprint, request, jsonify
from utils.db import users, sessions as sessions_collection
from datetime import datetime
import uuid
import random
from datetime import  timedelta
from flask import request
from ecdsa import SECP256k1, VerifyingKey
from binascii import unhexlify

# in-memory cache fallback
sessions = {}
# SESSION_TTL = 900  time duration

challenges = {}
CHALLENGE_TTL = 120

login_attempts = {}
MAX_ATTEMPTS = 5
BLOCK_DURATION = timedelta(minutes=15)

auth_bp = Blueprint("auth", __name__)


def find_user_by_username(username):
    """Return (user_doc, username_norm) or (None, username_norm).
    Tries normalized lookup first, then legacy lookup by original username.
    If legacy doc is found, patch it with username_norm for future queries.
    """
    if not isinstance(username, str):
        return None, None
    username_norm = username.strip().lower()
    user = users.find_one({"username_norm": username_norm})
    if user:
        return user, username_norm

    # fallback to legacy username field
    user = users.find_one({"username": username})
    if user:
        try:
            users.update_one({"_id": user.get("_id")}, {"$set": {"username_norm": username_norm}})
        except Exception:
            pass
        return user, username_norm

    return None, username_norm



def get_username_from_token():
    # Try Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split()[1]

    # Fallback to a custom header
    if not token:
        token = request.headers.get("X-Session-Token") or request.headers.get("x-session-token")

    # Fallback to query param
    if not token:
        token = request.args.get("session_token")

    # Fallback to JSON body (useful for some clients)
    if not token and request.method in ("POST", "PUT", "PATCH"):
        try:
            data = request.get_json(silent=True) or {}
            token = data.get("session_token")
        except Exception:
            token = None

    # Fallback to cookies
    if not token:
        token = request.cookies.get("session_token")

    if not token:
        return None

    # First check in-memory cache
    session = sessions.get(token)
    if not session:
        # Fallback to persistent sessions collection
        try:
            doc = sessions_collection.find_one({"token": token})
            if doc:
                session = {"username": doc.get("username")}
                # refresh in-memory cache
                sessions[token] = session
        except Exception:
            session = None

    if not session:
        return None

    # Sessions are persistent until explicit logout. Do not expire automatically.
    return session.get("username")



@auth_bp.route("/auth/register", methods=["POST"])
def register():
    """
    Registers a new user
    Expects JSON: { username, publicY, salt_kdf, kdf_params, vault_blob }
    """
    data = request.get_json()

    # Basic validation
    required_fields = ["username", "publicY", "salt_kdf", "kdf_params"]
    for field in required_fields:
        if field not in data:
            return jsonify({"status": "error", "message": f"Missing {field}"}), 400

    username = data["username"]
    # normalize username to avoid case/whitespace mismatches across devices
    username_norm = username.strip().lower()

    # Check if username already exists (normalized)
    if users.find_one({"username_norm": username_norm}):
        return jsonify({"status": "error", "message": "Username already exists"}), 400

    # Prepare user record
    user_doc = {
        "username": username,
        "username_norm": username_norm,
        "publicY": data["publicY"], # ec public key hex/base64
        "salt_kdf": data["salt_kdf"], #base64
        "kdf_params": data["kdf_params"], #pbkdf2 params
        # optional encrypted backup blob (client-side encrypted private key)
        "encrypted_backup": data.get("encrypted_backup", None),
        "vault_blob": data.get("vault_blob", None),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    try:
        users.insert_one(user_doc)
        log_event("REGISTER", username=username, details="New user registered.")
        return jsonify({"status": "success", "message": "User registered successfully"})
    
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



@auth_bp.route("/auth/backup", methods=["GET"])
def get_encrypted_backup():
    """Return the encrypted backup blob and KDF params for a username.
    Query param: ?username=alice
    This endpoint should be protected/rate-limited in production.
    """
    username = request.args.get("username")
    if not username:
        return jsonify({"status": "error", "message": "username required"}), 400

    user, _ = find_user_by_username(username)
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404

    return jsonify({
        "status": "success",
        "encrypted_backup": user.get("encrypted_backup"),
        "salt_kdf": user.get("salt_kdf"),
        "kdf_params": user.get("kdf_params")
    })





@auth_bp.route("/auth/challenge", methods=["POST"])
def generate_challenge():
    """
    Generates a Schnorr challenge for login
    Expects JSON: { username }
    Returns: { challenge_id, c, expires_at }
    """
    data = request.get_json()
    username = data.get("username")

    # Check if user exists (normalized lookup with legacy fallback)
    user, username_norm = find_user_by_username(username)
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404

    # Generate random challenge
    c = random.randint(1, 2**32) 
    challenge_id = str(uuid.uuid4())
    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=CHALLENGE_TTL)

    # Store challenge in memory (store normalized username to avoid mismatch)
    challenges[challenge_id] = {
        "username_norm": username_norm,
        "c": c,
        "issued_at": now,
        "expires_at": expires_at,
        "used": False
    }

    # include KDF params so clients without localStorage can derive the root key
    return jsonify({
        "status": "success",
        "challenge_id": challenge_id,
        "c": c,
        "expires_at": expires_at.isoformat(),
        "salt_kdf": user.get("salt_kdf"),
        "kdf_params": user.get("kdf_params")
    })





@auth_bp.route("/auth/verify", methods=["POST"])
def verify_proof():
    """
    Verifies Schnorr proof from frontend.
    Expects JSON: { username, challenge_id, R, s }
    """
    import hashlib, secrets
    from ecdsa import SECP256k1, VerifyingKey
    from binascii import unhexlify

    data = request.get_json()
    username = data.get("username")
    challenge_id = data.get("challenge_id")
    R_hex = data.get("R")  # client nonce (compressed)
    s_hex = data.get("s")  # hex string

    # Log an attempt (minimal) to help debug occasional failures
    try:
        log_event("VERIFY_ATTEMPT", username=username, details=f"challenge_id={challenge_id}")
    except Exception:
        pass

    # Basic validation
    if not all([username, challenge_id, R_hex, s_hex]):
        return jsonify({"status": "error", "message": "Missing fields"}), 400

    try:
        s_int = int(s_hex, 16)
    except:
        return jsonify({"status": "error", "message": "Invalid s value"}), 400


    # Fetch user (normalized lookup) first to get username_norm
    user, username_norm = find_user_by_username(username)
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404

    # Fetch challenge and validate against normalized username
    challenge = challenges.get(challenge_id)
    if not challenge or challenge.get("username_norm") != username_norm or challenge["used"]:
        return jsonify({"status": "error", "message": "Invalid or used challenge"}), 400
    if datetime.utcnow() > challenge["expires_at"]:
        return jsonify({"status": "error", "message": "Challenge expired"}), 400

    try:
        # Decode public key Y (compressed or uncompressed)
        Y_bytes = unhexlify(user["publicY"])
        Y_vk = VerifyingKey.from_string(Y_bytes, curve=SECP256k1)

        # Decode R (client nonce) from compressed
        R_bytes = unhexlify(R_hex)
        R_vk = VerifyingKey.from_string(R_bytes, curve=SECP256k1)  # supports compressed
    
        # Recompute c exactly as frontend: SHA256(challenge || R || Y)
        challenge_bytes = str(challenge["c"]).encode()  # original backend challenge integer
        data_bytes = challenge_bytes + R_bytes + Y_bytes
        c_int = int.from_bytes(hashlib.sha256(data_bytes).digest(), "big") % SECP256k1.order

        # EC Schnorr verification: s*G == R + c*Y
        G = SECP256k1.generator
        cpu_before = psutil.cpu_percent(interval=None)
        lhs = s_int * G
        rhs = R_vk.pubkey.point + c_int * Y_vk.pubkey.point
        
        cpu_after = psutil.cpu_percent(interval=0.4)
        cpu_usage = cpu_after - cpu_before if cpu_after >= cpu_before else cpu_after
        print(f"🔹 CPU usage during proof verification: {cpu_usage:.2f}%")



        if lhs == rhs:
            # Mark challenge used
            challenge["used"] = True
            # Generate session token
            token = secrets.token_hex(16)
            sessions[token] = {"username": username}
            # Persist session
            try:
                sessions_collection.insert_one({"token": token, "username": username, "created_at": datetime.utcnow()})
            except Exception:
                # if persistence fails, still allow in-memory session
                pass

            # Log successful ZKP verification
            log_event("LOGIN_SUCCESS", username=username, details="EC Schnorr proof verified successfully.")

            vault_blob = user.get("vault_blob", None)
            return jsonify({
                "status": "success",
                "message": "Login verified",
                "vault_blob": vault_blob,
                "session_token": token
            })
        else:
            return jsonify({"status": "error", "message": "Invalid proof"}), 400

    except Exception as e:
        import traceback as _tb
        tb = _tb.format_exc()
       
        try:
            log_event("VERIFY_ERROR", username=username, details=tb)
        except Exception:
            pass
        
        try:
            from utils import logger as _logger
            _logger.logging.error(tb)
        except Exception:
            pass
        return jsonify({"status": "error", "message": "Verification error", "detail": str(e)}), 500






@auth_bp.route("/vault", methods=["GET"])
def get_vault():
    """
    Get the vault_blob for a user.
    Expects query param: ?username=alice
    """
    username = get_username_from_token()
    if not username:
        return jsonify({"status": "error", "message": "Invalid or expired token"}), 401

    user, _ = find_user_by_username(username)
    vault_blob = user.get("vault_blob", None)
    return jsonify({"status": "success", "vault_blob": vault_blob})



@auth_bp.route("/vault", methods=["POST"])
def update_vault():
    """
    Update the vault_blob for a user.
    Expects JSON: { username, vault_blob: { iv, ciphertext, tag, version } }
    """
    username = get_username_from_token()
    if not username:
        return jsonify({"status": "error", "message": "Invalid or expired token"}), 401

    data = request.get_json()
    vault_blob = data.get("vault_blob")
    if not vault_blob:
        return jsonify({"status": "error", "message": "Missing vault_blob"}), 400

    users.update_one({"username_norm": username.strip().lower()}, {"$set": {"vault_blob": vault_blob, "updated_at": datetime.utcnow()}})
    log_event("VAULT_UPDATE", username=username, details="User updated vault.")

    return jsonify({"status": "success", "message": "Vault updated successfully"})




@auth_bp.route("/vault/entries", methods=["GET"])
def get_plain_entries():
    """
    Return plaintext vault entries for the authenticated user.
    """
    username = get_username_from_token()
    if not username:
        return jsonify({"status": "error", "message": "Invalid or expired token"}), 401

    user, _ = find_user_by_username(username)
    entries = user.get("plain_entries", []) if user else []
    return jsonify({"status": "success", "entries": entries})



@auth_bp.route("/vault/entries", methods=["POST"])
def add_plain_entry():
    """
    Append a plaintext vault entry to the user's plain_entries array.
    Expects JSON body with the entry object (any fields). The server will attach a simple id and timestamp if not provided.
    """
    username = get_username_from_token()
    if not username:
        return jsonify({"status": "error", "message": "Invalid or expired token"}), 401

    data = request.get_json() or {}
    entry = data.get("entry") or data

    # Basic normalization: ensure an id and created_at
    try:
        entry_id = entry.get("id") if isinstance(entry, dict) and entry.get("id") else str(uuid.uuid4())
    except Exception:
        entry_id = str(uuid.uuid4())

    entry.setdefault("id", entry_id)
    entry.setdefault("created_at", datetime.utcnow().isoformat())

    try:
        users.update_one({"username_norm": username.strip().lower()}, {"$push": {"plain_entries": entry}, "$set": {"updated_at": datetime.utcnow()}}, upsert=True)
        log_event("PLAIN_ENTRY_ADD", username=username, details=f"Added plain entry {entry.get('id')}")
        return jsonify({"status": "success", "message": "Entry saved"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



@auth_bp.route("/vault/entries/<entry_id>", methods=["DELETE"])
def delete_plain_entry(entry_id):
    """
    Delete a plaintext entry from the user's plain_entries array by id.
    """
    username = get_username_from_token()
    if not username:
        return jsonify({"status": "error", "message": "Invalid or expired token"}), 401

    try:
        # Load current entries to handle potential type mismatches or nested id formats.
        user, _ = find_user_by_username(username)
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404

        entries = user.get("plain_entries", []) or []

        # Filter out entries whose id matches the provided entry_id (string compare of id field)
        new_entries = [e for e in entries if str(e.get("id")) != str(entry_id)]

        if len(new_entries) == len(entries):
            # Nothing removed
            return jsonify({"status": "success", "message": "Entry not found"}), 200

        users.update_one(
            {"username": username},
            {"$set": {"plain_entries": new_entries, "updated_at": datetime.utcnow()}}
        )
        log_event("PLAIN_ENTRY_DELETE", username=username, details=f"Deleted plain entry {entry_id}")
        return jsonify({"status": "success", "message": "Entry deleted"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500





@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    """Invalidate the session token (logout)."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"status": "error", "message": "Missing token"}), 400
    token = auth_header.split()[1]
    if token in sessions:
        del sessions[token]
    # remove persisted session
    try:
        sessions_collection.delete_one({"token": token})
    except Exception:
        pass
    log_event("LOGOUT", details="User logged out")
    return jsonify({"status": "success", "message": "Logged out"})
