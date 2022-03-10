var Authentic = require('authentic-client')
var AsyncCache = require('async-cache')

var cache = new AsyncCache({ load: login, maxAge: 24 * 3600 * 1000 })
var config = require('../config')

var auth = Authentic({
  server: config.authentic.host
})

var creds = {
  email: config.authentic.email,
  password: config.authentic.password
}

module.exports = {
  get: get
}

function get (url, cb) {
  cache.get(null, function (err, res) {
    if (err) return cb(err)
    auth.get(url, cb)
  })
}

function login (key, cb) {
  auth.login(creds, cb)
}
