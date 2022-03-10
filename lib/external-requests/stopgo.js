var request = require('request')

var stopgoUrl = require('../../config').stopgoUrl
var { shouldMakeRequest } = require('../models/external-request')

var fn = process.env.NODE_ENV === 'test' ? testCheckStopgo : checkStopgo

module.exports = function (opts, cb) {
  shouldMakeRequest({ name: 'stopgo', fn, opts }, cb)
}

function checkStopgo ({ ip, requestId }, cb) {
  var options = {
    method: 'post',
    url: `${stopgoUrl}&reqId=${requestId}&ip=${ip}`,
    timeout: 1000,
    json: true,
    pool: { maxSockets: Infinity },
    headers: {
      'Content-Type': 'application/json'
    }
  }

  var t0 = Date.now()
  request.get(options, function (err, r, body) {
    console.log({
      externalAPI: 'Stopgo',
      responseTime: Date.now() - t0,
      externalIp: { response: body }
    })
    if (err) {
      err.message = `Stopgo API: ${err.message || err.code} ${requestId}`
      console.error(err)
      return cb(null)
    }
    if (!body) return cb(null)

    if (body && body.code && body.code === 'error') {
      console.error(new Error(`Stopgo API:  ${body.message} requestId: ${requestId}`))
      return cb(null)
    }
    cb(null, body)
  })
}

function testCheckStopgo ({ ip, requestId }, cb) {
  console.log({
    externalAPI: 'Stopgo'
  })
  if (ip === '8.8.8.8') {
    return cb(null, {
      code: 'not found',
      last_seen: null,
      message: 'Please present lead'
    })
  }
  cb(null, {
    code: 'found',
    last_seen: '2020-06-19T10:36:52Z',
    message: 'Please present lead'
  })
}
