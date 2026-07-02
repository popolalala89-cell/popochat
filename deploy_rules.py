#!/usr/bin/env python3
"""Deploy Firestore security rules using Firebase Admin SDK service account."""

import json
import time
import urllib.request
import urllib.parse
import base64
import hashlib
import hmac

# --- Load service account ---
with open('/data/data/com.termux/files/home/chat-app/server/service-account.json') as f:
    sa = json.load(f)

# --- Read new rules ---
with open('/data/data/com.termux/files/home/chat-app/firestore.rules') as f:
    rules_content = f.read()

project_id = sa['project_id']
client_email = sa['client_email']
private_key = sa['private_key']

# --- Generate OAuth2 token using JWT ---
# We need to create and sign a JWT with the service account's private key
# Using PyJWT if available, otherwise construct manually

try:
    import jwt
    # Create JWT
    now = int(time.time())
    payload = {
        'iss': client_email,
        'scope': 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
        'aud': 'https://oauth2.googleapis.com/token',
        'exp': now + 3600,
        'iat': now,
    }
    # Sign with RS256
    assertion = jwt.encode(payload, private_key, algorithm='RS256')
    
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
    resp = urllib.request.urlopen(req)
    token_data = json.loads(resp.read())
    access_token = token_data['access_token']
    print('✅ Got access token')
except Exception as e:
    print(f'❌ JWT auth failed: {e}')
    # Fallback: try with existing firebase-tools.json tokens
    with open('/data/data/com.termux/files/home/.config/configstore/firebase-tools.json') as f:
        d = json.load(f)
    access_token = d.get('tokens', {}).get('access_token', '')
    if not access_token:
        print('No fallback token available')
        exit(1)
    print('⚠️  Using cached token')

# --- Deploy rules via Firebase Rules API ---
# First, create a new ruleset
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

# Create ruleset
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
    ruleset_name = result['name']
    print(f'✅ Ruleset created: {ruleset_name}')
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print(f'❌ Ruleset creation failed: {e.code} {error_body[:300]}')
    exit(1)

# --- Update release to point to new ruleset ---
release_payload = json.dumps({
    'name': f'projects/{project_id}/releases/cloud.firestore',
    'rulesetName': ruleset_name,
}).encode()

req = urllib.request.Request(
    f'https://firebaserules.googleapis.com/v1/projects/{project_id}/releases/cloud.firestore',
    data=release_payload,
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    },
    method='PATCH'
)

try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    print(f'✅ Release updated: {result.get("name")}')
    print(f'✅ Firestore rules deployed successfully!')
except urllib.error.HTTPError as e:
    # If release doesn't exist, create it
    if e.code == 404:
        req = urllib.request.Request(
            f'https://firebaserules.googleapis.com/v1/projects/{project_id}/releases',
            data=json.dumps({
                'name': f'projects/{project_id}/releases/cloud.firestore',
                'rulesetName': ruleset_name,
            }).encode(),
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json',
            }
        )
        try:
            resp = urllib.request.urlopen(req)
            result = json.loads(resp.read())
            print(f'✅ Release created: {result.get("name")}')
            print(f'✅ Firestore rules deployed successfully!')
        except urllib.error.HTTPError as e2:
            error_body = e2.read().decode()
            print(f'❌ Release creation failed: {e2.code} {error_body[:300]}')
            exit(1)
    else:
        error_body = e.read().decode()
        print(f'❌ Release update failed: {e.code} {error_body[:300]}')
        exit(1)
