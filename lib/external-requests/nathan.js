var request = require('request')
var getDateDiff = require('../utils/date-difference')
var { shouldMakeRequest } = require('../models/external-request')

var fn = process.env.NODE_ENV === 'test' ? testCheckNathan : checkNathan

module.exports = function (opts, cb) {
  shouldMakeRequest({ name: 'responseNathan', fn, opts }, cb)
}

function checkNathan ({ ip, requestId }, cb) {
  var url = 'https://le.dailyfinancegroup.com/api/v2/ip/lookup'

  var out = {
    apiKey: 'Cl;%oJ^kD<~SnMEu(,2[E@,f!4<bsX',
    ips: [ip]
  }
  var options = {
    method: 'post',
    url,
    timeout: 1500,
    body: out,
    json: true,
    forever: true,
    pool: { maxSockets: Infinity },
    headers: {
      'Content-Type': 'application/json'
    }
  }

  var t0 = Date.now()
  request.post(options, function (err, r, body) {
    console.log({
      externalAPI: 'nathan',
      responseTime: Date.now() - t0
    })

    if (err) {
      err.message = `Nathan API: ${err.message || err.code} ${requestId}`
      console.error(err)
      return cb(null, { status: 'ERROR' })
    }

    var responseNathan = body && body.ipMatches && body.ipMatches[ip]
    if (!responseNathan) return cb(null, false)
    var criteria = {}
    criteria.nathanStatus = responseNathan.status
    criteria.nathanSellPrice = responseNathan.sellPrice || 0
    criteria.nathanNDaysLastSeen = responseNathan.seenAt
      ? getDateDiff(new Date(responseNathan.seenAt))
      : Infinity
    cb(null, criteria)
  })
}

function testCheckNathan ({ ip, requestId }, cb) {
  console.log({
    externalAPI: 'nathan'
  })

  var testIps = {
    '192.168.1.1': {
      status: 'SOLD',
      seenAt: '2018-09-11 12:00:00.000',
      sellPrice: '100.36'
    },
    '64.186.123.21': {
      status: 'SOLD',
      seenAt: '2018-09-11 12:00:00.000',
      sellPrice: '100.36'
    },
    '192.168.1.5': {
      status: 'UNSOLD',
      seenAt: '2018-09-11 12:00:00.000'
    },
    '192.168.1.7': {
      status: 'UNIQUE'
    }
  }
  var responseNathan = testIps[ip]
  if (!responseNathan) return cb(null, false)
  var criteria = {}
  criteria.nathanStatus = responseNathan.status
  criteria.nathanSellPrice = responseNathan.sellPrice || 0
  criteria.nathanNDaysLastSeen = responseNathan.seenAt
    ? getDateDiff(new Date(responseNathan.seenAt))
    : Infinity
  cb(null, criteria)
}
