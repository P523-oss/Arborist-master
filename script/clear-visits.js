var async = require('async')
var db = require('../lib/db')

db.keys('visit:*', function (err, keys) {
  if (err) return console.error(err)
  async.map(keys, db.ttl.bind(db), function (err, ttls) {
    if (err) return console.error(err)

    var delKeys = keys.filter(function (key, i) {
      return ttls[i] < 0
    })

    async.map(delKeys, db.del.bind(db), function (err) {
      if (err) return console.error(err)
      console.log('done')
    })
  })
})
