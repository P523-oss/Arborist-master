var db = require('../db')
var { shouldMakeRequest } = require('../models/external-request')

var LAST_ACCEPT = 'last:accept'

module.exports = {
  get,
  put
}

function get (ip, cb) {
  if (!ip) return cb()

  shouldMakeRequest({ name: 'ipInternalStats', fn: dbHGet, opts: ip }, cb)
}

function dbHGet (ip, cb) {
  db.hget(LAST_ACCEPT, ip, cb)
}

function put (ip) {
  if (!ip) return
  var date = new Date().toISOString().slice(0, 10)
  db.hset(LAST_ACCEPT, ip, date)
}
