var request = require('request')
// var timeout = require('../../config').timeout
var token = require('../../config').leadsmarketToken
var getDateDiff = require('../utils/date-difference')
var { shouldMakeRequest } = require('../models/external-request')

var fn = process.env.NODE_ENV === 'test' ? testLeadsmarket : leadsmarket

module.exports = function (opts, cb) {
  shouldMakeRequest({ name: 'leadsmarket', fn, opts }, cb)
}

function leadsmarket ({ ip, userAgent, requestId }, cb) {
  if (!ip || !userAgent) return cb(null, null)

  const url = 'https://flow.lmnext.io/endpoint/interlincx'
  var options = {
    method: 'GET',
    url,
    qs: { ip: ip, userAgent: userAgent },
    timeout: 1000,
    headers: {
      'cache-control': 'no-cache',
      Connection: 'keep-alive',
      'Accept-Encoding': 'gzip, deflate',
      Host: 'flow.lmnext.io',
      'Cache-Control': 'no-cache',
      Accept: '*/*',
      Authorization: `Basic ${token}`
    },
    json: true,
    gzip: true
  }
  var t0 = Date.now()

  request(options, function (err, response, body) {
    console.log({
      externalAPI: 'leadsmarket',
      responseTime: Date.now() - t0,
      externalIp: { response: body, request: options.qs }
    })
    if (err) {
      err.message = `Leadsmarket API: ${err.message || err.code} ${requestId}`
      console.warn(err)
      return cb(null, false)
    }

    if (!body) return cb(null, false)
    var criteria = {}

    criteria.leadsmarketLastSeen = body.lastSeen || false
    criteria.leadsmarketLastSeenDays = criteria.leadsmarketLastSeen
      ? getDateDiff(new Date(criteria.leadsmarketLastSeen))
      : Infinity
    criteria.leadsmarketWillPurchase = body.willPurchase
    if (body.sold) criteria.leadsmarketSold = body.sold
    cb(null, criteria)
  })
}
function testLeadsmarket ({ ip, userAgent, requestId }, cb) {
  console.log({
    externalAPI: 'leadsmarket'
  })
  if (!ip || !userAgent) return cb(null, false)

  var body = {
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:70.0) Gecko/20100101 Firefox/70.0',
    willPurchase: true,
    lastSeen: false
  }
  var criteria = {}

  criteria.leadsmarketLastSeen = body.lastSeen || false
  criteria.leadsmarketWillPurchase = body.willPurchase
  if (body.sold) criteria.leadsmarketSold = body.sold
  cb(null, criteria)
}
