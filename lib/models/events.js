var cuid = require('cuid')

var db = require('../multilevel')
var pubsub = require('../pubsub')
var log = require('../utils/log')

module.exports = {
  put,
  putRequestIdInfo,
  getRequestIdInfo,
  getDateRangeReport
}

function put (event, cb) {
  var eventId = cuid()
  var date = new Date().toISOString().slice(0, 10)

  event.date = date
  event.eventId = eventId
  pubsub(event)
  log(event)

  var key = `date-eventId\xff${date}\xff${eventId}`
  db.put(key, event, cb)
}

function getDateRangeReport ({ dateStart, dateEnd }) {
  return db.createValueStream({
    gte: `date-eventId\xff${dateStart}`,
    lte: `date-eventId\xff${dateEnd}\xff\xff`
  })
}

function putRequestIdInfo ({ id, value }, cb) {
  db.put(id, value, cb)
}

function getRequestIdInfo (id, cb) {
  db.get(id, function (err, response) {
    if (err) return cb(null, {})
    if (!response) return cb(null, {})

    var parsed = {}
    try {
      parsed = JSON.parse(response)
    } catch (e) {
      console.error(e)
    }

    cb(null, parsed)
  })
}
