var xtend = require('xtend')
var Authentic = require('authentic-service')
var URL = require('url')

var config = require('../config')

var authentic = process.env.NODE_ENV === 'test'
  ? testAuthentic
  : Authentic({ server: config.authentic.host })

module.exports = function (fn, configOptions = {}) {
  var { allowAuthenticated } = configOptions

  return function authify (req, res, opts, cb) {
    authentic(req, res, function (err, creds) {
      if (err) return cb(err)
      if (!creds || !creds.email) {
        return cb(createAuthError('Invalid Credentials'))
      }

      req.auth = creds
      var isAdmin = checkIsAdmin(creds)
      var authorized = isAdmin || allowAuthenticated
      if (authorized) return fn(req, res, xtend(opts, { auth: creds, isAdmin }), cb)

      cb(createAuthError('Unauthorized: ' + creds.email))
    })
  }
}

function testAuthentic (req, res, cb) {
  var queryObject = URL.parse(req.url, true).query // eslint-disable-line
  var advertiserEmail = queryObject.authenticEmail

  if (advertiserEmail) return cb(null, { email: advertiserEmail })

  return cb(null, { email: 'test@interlincx.com' })
}

function createAuthError (msg) {
  var err = new Error(msg || 'Unauthorized')
  err.statusCode = 401
  return err
}

function checkIsAdmin (creds) {
  var isAdmin = false
  if (creds.email.match(/@lincx\.la$/)) isAdmin = true
  if (creds.email.match(/@interlincx\.com$/)) isAdmin = true
  return isAdmin
}
