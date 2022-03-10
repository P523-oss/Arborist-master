var async = require('async')
var _ = require('lodash')

var db = require('./db')
var Targets = require('./models/targets')

var UNIQUE_USER = (ip, date, targetId) => `unique:${date}:${targetId}:${ip}`

module.exports = {
  get,
  put
}

function get (ip, cb) {
  Targets.list(function (err, targets) {
    if (err) return cb(err)

    async.filter(targets, function (target, cb) {
      var date = new Date().toISOString().slice(0, 10)
      var key = UNIQUE_USER(ip, date, target.id)
      db.get(key, function (err, value) {
        var result = false
        if (err || value) result = true
        cb(null, result)
      })
    }, cb)
  })
}

function put ({ ip, target }, cb) {
  if (!target || !target.id || !_.get(target, 'accept.uniqueDailyIP')) return cb(null)
  var date = new Date().toISOString().slice(0, 10)
  var key = UNIQUE_USER(ip, date, target.id)
  db.multi()
    .set(key, 1)
    .expire(key, 60 * 60 * 24)
    .exec(cb)
}
