FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps required to build some Python packages
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential libssl-dev libffi-dev \
  && rm -rf /var/lib/apt/lists/*

 # Copy backend sources
COPY . ./
COPY requirements.txt .
# Install Python dependencies explicitly (do not rely on malformed requirements.txt)
RUN pip install --no-cache-dir -r requirements.txt



# Expose default port for documentation only; Railway provides $PORT at runtime.
EXPOSE 5000
# Use an entrypoint that binds to the platform-provided $PORT (Railway compatibility).
# If PORT is not set, fall back to 5000.
ENV PORT=${PORT:-5000}
CMD ["sh", "-lc", "gunicorn --bind 0.0.0.0:${PORT} app:app --workers 3 --timeout 60"]
