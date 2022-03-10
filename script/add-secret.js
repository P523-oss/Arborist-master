const { spawnSync, execSync } = require('child_process')
const [projectId, secretId, secretFile] = process.argv.slice(2)

if (!(projectId && secretId && secretFile)) {
  console.error(
    'USAGE: node add-secret.js projectId secretId secretFile'
  )
}

execSync('gcloud config configurations activate default')

execSync(
  `gcloud secrets create ${secretId} --project ${projectId} --replication-policy="automatic"`
)

spawnSync(
  'gcloud',
  `secrets versions add ${secretId} --project ${projectId} --data-file=${secretFile}`.split(
    ' '
  )
)

execSync(
  `gcloud secrets add-iam-policy-binding --member=serviceAccount:${projectId}@appspot.gserviceaccount.com --role=roles/secretmanager.secretReader --project=${projectId} ${secretId}`
)

execSync(
  `gcloud secrets versions access latest --project=${projectId} --secret ${secretId}`
)
