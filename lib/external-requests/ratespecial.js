var request = require('request')

// var timeout = require('../../config').timeout
var { shouldMakeRequest } = require('../models/external-request')

var fn = process.env.NODE_ENV === 'test' ? testCheckLead : checkLead

module.exports = function (opts, cb) {
  shouldMakeRequest({ name: 'ratespecial7', fn, opts }, cb)
}

function checkLead ({ ip, requestId }, cb) {
  var url = `https://leadcheck.ratespecial.com/api/check-ip?ip=${ip}&reqId=${requestId}`
  var opts = {
    Accept: 'application/json',
    pool: { maxSockets: Infinity },
    rejectUnauthorized: false,
    timeout: 500
  }

  var t0 = Date.now()
  request.get(url, opts, function (err, r, body) {
    console.log({
      externalAPI: 'ratespecial',
      responseTime: Date.now() - t0
    })

    if (err) {
      err.message = 'Ratespecial API: ' + err.message || err.code
      console.warn(err)
      return cb(null, false)
    }

    cb(null, body === 'found')
  })
}

function testCheckLead ({ ip, requestId }, cb) {
  console.log({
    externalAPI: 'ratespecial'
  })
  cb(null, true)
}
