#!/usr/bin/env bash
set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1
cd /workspace

if ! sudo docker info >/dev/null 2>&1; then
  sudo service docker start
  ready=0
  for _ in $(seq 1 30); do
    if sudo docker info >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" -ne 1 ]]; then
    echo "Docker daemon did not become ready" >&2
    exit 1
  fi
fi

if [[ ! -f supabase/config.toml ]]; then
  supabase init
fi

if ! curl -sf -o /dev/null "http://127.0.0.1:54321/auth/v1/health"; then
  sg docker -c "supabase start"
fi

eval "$(sg docker -c "supabase status -o env" | grep -E '^[A-Z0-9_]+=' )"
export API_URL ANON_KEY SERVICE_ROLE_KEY

cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
EOF

python3 - <<'PY'
import json, os, urllib.error, urllib.request

api = os.environ["API_URL"].rstrip("/")
key = os.environ["SERVICE_ROLE_KEY"]
email = "admin@almstead.com"
password = "local-dev-password"

def call(method, path, body=None, headers=None):
    data = None if body is None else json.dumps(body).encode()
    req_headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if headers:
        req_headers.update(headers)
    request = urllib.request.Request(api + path, data=data, method=method, headers=req_headers)
    try:
        with urllib.request.urlopen(request) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        raise SystemExit(f"{method} {path} failed: {error.code} {raw}")

_, payload = call("GET", "/auth/v1/admin/users")
user = next((item for item in payload.get("users", []) if item.get("email") == email), None)
if user is None:
    _, user = call(
        "POST",
        "/auth/v1/admin/users",
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": "Local Admin"},
        },
    )

call(
    "POST",
    "/rest/v1/users?on_conflict=id",
    {
        "id": user["id"],
        "name": "Local Admin",
        "email": email,
        "role": "admin",
        "active": True,
    },
    {"Prefer": "resolution=merge-duplicates"},
)
print(f"local admin ready: {user['id']}")
PY

if curl -sf -o /dev/null "http://127.0.0.1:3000/login"; then
  echo "Next.js dev server is already listening on port 3000"
  exit 0
fi

# Turbopack in Next.js 16.2.9 fails to compile next/font/google
# ("queries have exactly one entry"). Webpack dev serves the app.
exec npm run dev -- --webpack --hostname 0.0.0.0 --port 3000
