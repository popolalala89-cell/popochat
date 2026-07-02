const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Init Admin SDK dengan service account yang sama
const serviceAccount = require('./server/service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const projectId = serviceAccount.project_id;
const rulesPath = path.join(__dirname, 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

// Dapetin access token dari credential
admin.credential.cert(serviceAccount).getAccessToken()
  .then(({ access_token }) => {
    console.log('✅ Got access token');
    return deployRules(access_token, projectId, rulesContent);
  })
  .then(() => {
    console.log('✅ Firestore rules deployed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  });

async function deployRules(token, projectId, rulesContent) {
  // Step 1: Create ruleset
  const rulesetPayload = JSON.stringify({
    source: {
      files: [{ name: 'firestore.rules', content: rulesContent }]
    }
  });

  const rulesetRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: rulesetPayload,
    }
  );

  if (!rulesetRes.ok) {
    const errText = await rulesetRes.text();
    throw new Error(`Ruleset creation failed: ${rulesetRes.status} ${errText.substring(0, 300)}`);
  }

  const { name: rulesetName } = await rulesetRes.json();
  console.log(`✅ Ruleset created: ${rulesetName}`);

  // Step 2: Update/create release
  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
  const releasePayload = JSON.stringify({
    name: `projects/${projectId}/releases/cloud.firestore`,
    rulesetName,
  });

  let releaseRes = await fetch(releaseUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: releasePayload,
  });

  if (releaseRes.status === 404) {
    // Release doesn't exist yet, create it
    releaseRes = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: releasePayload,
      }
    );
  }

  if (!releaseRes.ok) {
    const errText = await releaseRes.text();
    throw new Error(`Release failed: ${releaseRes.status} ${errText.substring(0, 300)}`);
  }

  const releaseData = await releaseRes.json();
  console.log(`✅ Release: ${releaseData.name}`);
}
