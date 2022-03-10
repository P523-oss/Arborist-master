var request = require('request')

var timeout = require('../../config').timeout
var { shouldMakeRequest } = require('../models/external-request')

var fn = module.exports = process.env.NODE_ENV === 'test' ? testCheckJordan : checkJordan

module.exports = function (opts, cb) {
  shouldMakeRequest({ name: 'jordan', fn, opts }, cb)
}

function checkJordan ({ ip, userAgent, requestId, origin }, cb) {
  var out = {
    apikey: 'f551b1097932dca7297d3bc5010388f2',
    campaign: '6554678',
    ip: ip,
    origin: origin,
    ua: userAgent
  }
  const url = 'https://api.247lendinggroup.com/v1/age'
  var options = {
    method: 'post',
    url,
    timeout: timeout,
    body: out,
    json: true,
    pool: { maxSockets: Infinity },
    headers: {
      'Content-Type': 'application/json'
    }
  }

  var t0 = Date.now()
  request.post(options, function (err, r, body) {
    console.log({
      externalAPI: 'Jordan Age',
      responseTime: Date.now() - t0,
      externalIp: { response: body, request: out }
    })

    if (err) {
      err.message = `Jordan Age API: ${err.message || err.code} ${requestId}`
      console.error(err)
      return cb(null)
    }
    if (body && body.age === -1) body.age = Infinity
    if (body && body.status) return cb(null, body)

    if (body && body.error && body.message) {
      console.error(new Error(`Jordan Age API: ${body.message} requestId: ${requestId}`))
    }
    cb(null)
  })
}

function testCheckJordan ({ ip, requestId, origin }, cb) {
  console.log({
    externalAPI: 'Jordan Age'
  })
  cb(null, { age: 13, api_click_id: '111111111' })
}
