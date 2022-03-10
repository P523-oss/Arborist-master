var isEmpty = require('lodash').isEmpty

var db = require('../db')
var { convertId } = require('../external-requests/typ')

var KEY = longId => `showm3-lookup-cache:longId:${longId}`

module.exports = {
  get,
  put
}

function get (id, cb) {
  var key = KEY(id)

  db.get(key, function (err, shortId) {
    if (err) {
      console.error(`Getting showm3 ids lookup failed. Err: ${err}`)
      return fetchTipinAndCache(id, cb)
    }

    if (!shortId) return fetchTipinAndCache(id, cb)

    cb(null, shortId)
  })
}

function put (id, shortId) {
  var key = KEY(id)

  db.set(key, shortId, 'EX', 60 * 60 * 24, function (err) {
    if (err) console.error(`Saving showm3 ids lookup failed. Err: ${err}`)
  })
}

function fetchTipinAndCache (id, cb) {
  convertId({ longId: id }, function (err, ids) {
    if (err) {
      console.error(`Problem fetching lookup from tipin ${err}`)
      return cb(null, null)
    }

    if (isEmpty(ids)) return cb(null, null)

    put(id, ids.short_id)

    return cb(null, ids.short_id)
  })
}
