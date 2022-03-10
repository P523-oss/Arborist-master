var db = require('../db')

var KEY = ({ targetId }) => `rateHistory:targetid:${targetId}`

module.exports = {
  get,
  put
}

function get ({ targetId, date }, cb) {
  var key = KEY({ targetId })
  var timestamp = new Date(date).valueOf()

  db.ZREVRANGEBYSCORE(key, timestamp, -Infinity, 'LIMIT', 0, 1, function (err, response) {
    if (err) return cb(err)
    if (response && response.length === 0) response = '{}'
    cb(null, JSON.parse(response))
  })
}

function put ({ targetId, rateAmount, rateType }, cb) {
  if (!targetId || !rateAmount || !rateType) return cb()
  var key = KEY({ targetId })
  var timestamp = Date.now()

  db.zadd([key, timestamp, JSON.stringify({ targetId, rateType, rateAmount, timestamp })], cb)
}
