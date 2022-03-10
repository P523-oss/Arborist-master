var dotenv = require('dotenv')
var { execSync } = require('child_process')

var PROJECT_ID = 'arborist-212100'
var SECRET_ID = 'arborist-env'

dotenv.config()

var remoteEnv = process.env.NODE_ENV !== 'production'
  ? {}
  : dotenv.parse(
    execSync(`node script/fetch-secrets.js ${PROJECT_ID} ${SECRET_ID}`)
  )

Object.keys(remoteEnv).forEach(function (key) {
  if (Object.prototype.hasOwnProperty.call(process.env, key)) return
  process.env[key] = remoteEnv[key]
})

module.exports = {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  },
  authentic: {
    host: process.env.AUTHENTIC_HOST || 'https://ix-id.lincx.la',
    email: process.env.AUTHENTIC_EMAIL,
    password: process.env.AUTHENTIC_PASSWORD
  },
  level: {
    location: process.env.LEVEL_LOCATION || '/tmp/db'
  },
  multilevel: {
    host: process.env.MULTILEVEL_HOST || 'localhost',
    port: process.env.MULTILEVEL_PORT || 9000,
    force: process.env.MULTILEVEL_FORCE === 'true',
    valueEncoding: 'json'
  },
  gcs: {
    project: process.env.GCS_PROJECT_ID,
    creds: parseCreds(process.env.GCS_CREDS),
    topic: process.env.GCS_TOPIC,
    bucket: process.env.GCS_BUCKET || 'ix-arborist-reports'
  },
  domain: process.env.DOMAIN || 'https://arborist.lincx.in',
  timeout: parseInt(process.env.TIMEOUT || 750),
  leadsmarketToken: 'aW50ZXJsaW5jeDo5JkNhUTNANzYhcyRmQUFSbWlCalhYaHVXJF5UWUJLag==',
  AERHost: 'https://ad-event-reports.lincx.la',
  cookie: keyOpts(),
  stopgoUrl: process.env.STOPGO_HOST || 'https://api-us.stopgonet.com/leadsgateway/dnp?aff=89674536',
  bucketName: process.env.BUCKET_NAME || 'arborist-project-bucket-name',
  itMedia: {
    username: process.env.ITMEDIA_USERNAME,
    password: process.env.ITMEDIA_PASSWORD
  }
}

function parseCreds (credStr) {
  if (!credStr) return {}

  var obj = {}
  try {
    obj = JSON.parse(Buffer.from(credStr, 'base64'))
  } catch (e) {
    console.error(e)
  }
  return obj
}

function keyOpts () {
  const opts = {
    encryptionKey: 'ZrqZJYxmz7pWVPMs' || process.env.COOKIE_ENCRYPTION_KEY || 'super-secret-key',
    signingKey: ['V8sWHtdwXgcsJNen'] || [process.env.COOKIE_SIGNING_KEY] || ['super-secret-signing-key'],
    secure: true,
    domain: '.lincx.in'
  }
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    opts.encryptionKey = 'super-secret-key'
    opts.signingKey = ['super-secret-signing-key']
    opts.secure = false
    opts.domain = ''
  }
  return opts
}
