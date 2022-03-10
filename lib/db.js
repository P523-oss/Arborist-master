var config = require('../config')

var engine = {
  undefined: require('fakeredis'),
  test: require('fakeredis'),
  production: require('redis'),
  development: require('redis')
}[process.env.NODE_ENV]

var db = module.exports = engine.createClient(config.redis)

db.healthCheck = function (cb) {
  var now = Date.now().toString()
  db.set('!healthCheck', now, function (err) {
    if (err) return cb(err)
    db.get('!healthCheck', function (err, then) {
      if (err) return cb(err)
      // if (now !== then.toString()) return cb(new Error('DB write failed'))
      cb()
    })
  })
}
