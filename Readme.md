# ZeroVault — Zero-Knowledge Password Manager

<img width="1900" height="872" alt="image" src="https://github.com/user-attachments/assets/50d69542-d449-404a-a747-9fe965701944" />

<img width="1919" height="781" alt="image" src="https://github.com/user-attachments/assets/7ee4f325-2a3b-4c6d-b21b-0e493eb9b627" />

<img width="1897" height="873" alt="image" src="https://github.com/user-attachments/assets/8b0f8ab0-2e4c-4e1a-a00a-d43a6c8f388c" />

<img width="1901" height="870" alt="image" src="https://github.com/user-attachments/assets/dd8c31ec-588a-41d2-8e29-9ee4f1b6068f" />


ZeroVault is a privacy-first password manager that demonstrates zero-knowledge authentication (ZKA) and zero-knowledge proofs (ZKP) at the application layer. The vault is built as a full-stack demo: a React/Vite frontend and a Flask backend with MongoDB. The design keeps user secrets encrypted on the client and uses cryptographic proofs (EC-Schnorr and related primitives) so the server never learns raw passwords or master keys.

This README is written for presentation and evaluation. It covers the project's goals, architecture, security design (ZKP + EC-Schnorr), how to run the project locally, and where the screenshots are stored for demonstration.

## Highlights

- Zero-Knowledge Authentication: users prove knowledge of their secret without revealing it to the server.
- EC-Schnorr proofs: elliptic-curve Schnorr-style signatures/proofs are used for authentication and verification flows.
- Client-side encryption: plaintext passwords never leave the user's device. The vault stores ciphertext only.
- No raw passwords on the server: server stores verifiable public values and encrypted blobs only.
- Simple, auditable stack: React + Vite frontend, Flask backend, MongoDB for metadata.

## Architecture (at a glance)

- Frontend (frontend/)
  - Vite + React application
  - Contains UI components under `src/components/` and pages under `src/pages/`
  - Implements cryptographic flows (KDF, AES encryption, ZKP helpers) in `src/utils/` and `src/lib/`
- Backend (backend/)
  - Flask app (`backend/app.py`) exposing a small auth API (`backend/routes/auth.py`)
  - Uses `pymongo`/MongoDB for storing user records and metadata
  - Keeps only encrypted blobs and public verification values
- Utils (utils/)
  - Shared helpers for logging and DB glue (server-side)

## Security design — what really matters

This section explains the reasoning and the cryptographic choices used by the project.

Goal: Keep user secrets private while still enabling secure authentication.

1) Zero-Knowledge Authentication (ZKA / ZKP)
- Users authenticate by proving knowledge of a secret (derivation of their password / seed) without sending it.
- The server stores public verification values and challenges. The client computes a proof (using EC-Schnorr style operations) and sends only the proof for verification.
- A successful verification confirms identity without the server ever having the user's secret.

2) EC-Schnorr (Elliptic Curve Schnorr)
- The project uses elliptic-curve Schnorr-style proofs/signatures to provide non-interactive or interactive proofs of knowledge.
- EC-Schnorr provides: compact proofs, strong security on standard curves (depending on params), and straightforward implementation using existing `ecdsa` or similar libraries.
- In practice: the client computes a random nonce, produces a Schnorr response computed with the private key (derived from the user's secret), and sends the response to the server which verifies the relation using the stored public key.

3) Client-side encryption and KDF
- User vault entries are encrypted on the client using a symmetric cipher (AES via `CryptoJS` / `pycryptodome` depending on side).
- A strong key derivation function (KDF) — e.g., Argon2 or PBKDF2 / scrypt — is used to derive encryption keys from the user's passphrase. The frontend contains kdf helpers.
- The server never stores KDF outputs that would allow recovery of the master key.

4) Minimal trust server
- Server holds only: user metadata, public verification values (public keys), and encrypted blobs (ciphertexts).
- Server verifies cryptographic proofs, but cannot decrypt the stored vault items.

5) Additional hardening
- Use HTTPS/TLS in production.
- Rate-limit and apply challenge-response to avoid replay/flood.
- Consider adding HSM or KeyVault for service-level ephemeral secrets (not user keys).

## Quick technical notes

- Python backend uses Flask and exposes a small auth blueprint in `backend/routes/auth.py`.
- The backend requirements are in `backend/requirements.txt` and include: `flask`, `pymongo`, `flask-cors`, `pycryptodome`, `ecdsa`, and `python-dotenv`.
- Frontend runs with Node + Vite (see `frontend/package.json`).

## Install & run (local dev)

Prerequisites
- Python 3.8+ and pip
- Node 16+ (for frontend)
- MongoDB (local instance or Atlas)

Backend

1) Create a Python virtualenv and install:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1; pip install -r backend\requirements.txt
```

2) Set environment variables in `backend/.env` (or your shell):

- MONGODB_URI (e.g. mongodb://localhost:27017/zerovault)
- FLASK_ENV=development

3) Run the backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1; python app.py
```

Frontend

1) Install and run:

```powershell
cd frontend
npm install
npm run dev
```

2) The app will show a local dev URL (Vite). Ensure the backend is running and CORS is enabled.

## API (high level)

- GET / — health check
- Auth blueprint (`backend/routes/auth.py`) — endpoints for registration, login (ZKP exchange), challenge/response flows, and retrieving/updating encrypted vault blobs.

Open `backend/routes/auth.py` to see exact routes and payloads used.

## How it works (user flow)

1) Registration
- Client generates a keypair derived from the user's passphrase (via KDF).
- Client sends a user record with a public verification value (public key) and the encrypted vault metadata.
- Server stores the public key and ciphertext only.

2) Login
- Server issues a nonce/challenge to the client.
- Client computes an EC-Schnorr style proof using the private key derived from the passphrase and returns the proof.
- Server verifies the proof against the stored public key.
- On success, server issues a session token (short-lived) for accessing encrypted blobs.

3) Vault usage
- All create/update operations encrypt data client-side before sending ciphertext to server.
- Decryption keys remain derived from user passphrase and never shared.

## Development notes & testing

- Use the `logs/` and `backend/logs/` folders for server logs (ignored by `.gitignore`).
- If cryptography primitives are updated, ensure compatibility with stored public values.

## Contributing

- Please follow secure design principles. Keep all secrets client-side for this project.
- Add tests for the ZKP flows and run them when changing cryptography code.

## Troubleshooting

- If the frontend cannot talk to the backend, check `CORS` settings in `backend/app.py` and ensure both dev servers are running on the expected ports.
- If login fails, verify the KDF parameters on both client and server (salt, iterations, memory) match expected values.

## Where to put the images

Create a `docs/` folder at repo root and place the two attached images there:

- `docs/hero.png` (landing image)
- `docs/dashboard.png` (dashboard screenshot)

This README references `docs/hero.png` at the top so GitHub will render the hero image in the file.

## License & acknowledgements

This project is a demo/proof-of-concept. Do not use it as-is for production security without a security review.

For cryptographic primitives consider audited libraries (libsodium / NaCl, libsuites) and standard protocols. EC-Schnorr and ZKP require careful implementation and side-channel-resistant operations.

---

Last updated: 2025-10-19
