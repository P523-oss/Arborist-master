var AsyncCache = require('async-cache')
var async = require('async')
var _ = require('lodash')

var auth = require('../authentic')

var cacheDay = new AsyncCache({ load: getRevenueCache, maxAge: 13 * 24 * 3600 * 1000 })
var cacheHour = new AsyncCache({ load: getRevenueCache, maxAge: 60 * 60 * 1000 })

module.exports = process.env.NODE_ENV === 'test' ? testGetRevenue : getRevenue

function getRevenue ({ daysRange, origin, endpoint }, cb) {
  async.map(daysRange, getDate, flatten(cb))

  function getDate (date, cb) {
    getRevenueByDate({ date, origin, endpoint, daysRange }, cb)
  }

  function flatten (fn) {
    return function (err, res) {
      if (err) return fn(err)

      cb(null, _.flatten(res))
    }
  }
}

function getRevenueByDate ({ date, origin, endpoint, daysRange }, cb) {
  var host = 'https://blackbird-reports.lincx.la'

  var url = `${host}/api/origin-endpoints`

  url += `?dateStart=${date}&dateEnd=${date}`
  url += `&origin=${origin}&endpoint=${endpoint}`

  if (daysRange.indexOf(date) === daysRange.length - 1) {
    return cacheHour.get(url, cb)
  }

  cacheDay.get(url, cb)
}

function getRevenueCache (url, cb) {
  auth.get(url, cb)
}

function testGetRevenue ({ dateStart = '', dateEnd = '', origin, endpoint }, cb) {
  return cb(null, result[endpoint] || [])
}

var result = {
  4000: [
    { revenue: { usd: 100 }, startDate: '10-09-2018' },
    { revenue: { usd: 0.5 }, startDate: '10-10-2018' }
  ],
  2000: [
    { revenue: { usd: 1 }, startDate: '10-09-2018' },
    { revenue: { usd: 2 }, startDate: '10-10-2018' }
  ]
}
