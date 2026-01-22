#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
SLOT_ID="${SLOT_ID:-1}"
CLIENT_ID="${CLIENT_ID:-1}"

echo "Base URL: $BASE_URL"
echo "Slot ID: $SLOT_ID"
echo "Client ID: $CLIENT_ID"
echo

request() {
  local path="$1"
  local url="$BASE_URL$path"

  echo "==> GET $url"
  curl -sS "$url"
  echo
  echo
}

# Slots
request "/api/slots"
request "/api/slots/$SLOT_ID/bank"

# Clients
clients_response="$(curl -sS "$BASE_URL/api/slots/$SLOT_ID/clients")"
echo "==> GET $BASE_URL/api/slots/$SLOT_ID/clients"
echo "$clients_response"
echo

client_ids_raw="$(python3 - "$clients_response" <<'PY'
import json
import sys

try:
    data = json.loads(sys.argv[1]) if len(sys.argv) > 1 else []
except json.JSONDecodeError:
    data = []

ids = []
if isinstance(data, list):
    for item in data:
        if isinstance(item, dict) and "id" in item:
            ids.append(str(item["id"]))

print(" ".join(ids))
PY
)"

IFS=' ' read -r -a client_ids <<< "$client_ids_raw"
client_count="${#client_ids[@]}"
client_label="clients"
verb="exist"
if [[ "$client_count" -eq 1 ]]; then
  client_label="client"
  verb="exists"
fi

for id in "${client_ids[@]}"; do
  request "/api/slots/$SLOT_ID/clients/$id"
  request "/api/slots/$SLOT_ID/clients/$id/transactions"
done

echo "Only $client_count $client_label $verb in save file $SLOT_ID."
echo "Please create new clients if you wish to display more data."
echo

# Investments & Charts
request "/api/slots/$SLOT_ID/investments/sp500"
request "/api/slots/$SLOT_ID/charts/clients"
