#!/usr/bin/env python3
"""
Deploy Firestore security rules ke Firebase.
Step 1: Create ruleset via REST API (Python + PyJWT)
Step 2: Release ruleset via Firebase Admin SDK (Node.js)
"""

import json
import subprocess
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
import os

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SA_PATH = os.path.join(SCRIPT_DIR, 'server', 'service-account.json')
RULES_PATH = os.path.join(SCRIPT_DIR, 'firestore.rules')
SERVER_DIR = os.path.join(SCRIPT_DIR, 'server')

# --- Step 1: Load service account & get access token ---
print('📖 Loading service account...')
with open(SA_PATH) as f:
    sa = json.load(f)

project_id = sa['project_id']

print('🔑 Generating access token...')
# Use PyJWT to sign a JWT assertion
import jwt

now = int(time.time())
payload = {
    'iss': sa['client_email'],
    'scope': 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
    'aud': 'https://oauth2.googleapis.com/token',
    'exp': now + 3600,
    'iat': now,
}
assertion = jwt.encode(payload, sa['private_key'], algorithm='RS256')

# Exchange for access token
data = urllib.parse.urlencode({
    'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    'assertion': assertion,
}).encode()

req = urllib.request.Request(
    'https://oauth2.googleapis.com/token',
    data=data,
    headers={'Content-Type': 'application/x-www-form-urlencoded'}
)

try:
    resp = urllib.request.urlopen(req)
    token_data = json.loads(resp.read())
    access_token = token_data['access_token']
    print('✅ Access token obtained')
except Exception as e:
    print(f'❌ Failed to get access token: {e}')
    sys.exit(1)

# --- Step 2: Read rules content ---
print('📄 Reading firestore.rules...')
with open(RULES_PATH) as f:
    rules_content = f.read()

# --- Step 3: Create ruleset via REST API ---
print('📦 Creating ruleset...')
ruleset_payload = json.dumps({
    'source': {
        'files': [
            {
                'name': 'firestore.rules',
                'content': rules_content,
            }
        ]
    }
}).encode()

req = urllib.request.Request(
    f'https://firebaserules.googleapis.com/v1/projects/{project_id}/rulesets',
    data=ruleset_payload,
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    }
)

try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    ruleset_name = result['name']  # e.g. projects/xxx/rulesets/abc-123
    ruleset_id = ruleset_name.split('/')[-1]
    print(f'✅ Ruleset created: {ruleset_name}')
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print(f'❌ Failed to create ruleset: {e.code} {error_body[:300]}')
    sys.exit(1)

# --- Step 4: Release via Firebase Admin SDK (Node.js) ---
print('🚀 Releasing ruleset via Firebase Admin SDK...')
node_script = f"""
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('{SA_PATH}');
admin.initializeApp({{ credential: admin.credential.cert(serviceAccount) }});

admin.securityRules().releaseFirestoreRuleset('{ruleset_id}')
  .then(() => {{
    console.log('✅ Rules released successfully!');
    process.exit(0);
  }})
  .catch(err => {{
    console.error('❌ Release failed:', err.message);
    process.exit(1);
  }});
"""

result = subprocess.run(
    ['node', '-e', node_script],
    capture_output=True,
    text=True,
    cwd=SERVER_DIR,
    timeout=30,
)

print(result.stdout.strip())
if result.returncode != 0:
    print(result.stderr.strip())
    print(f'❌ Release failed (exit code {result.returncode})')
    sys.exit(1)

print()
print('✅✅✅ Firestore rules deployed successfully!')
