var request = require('request')

var { shouldMakeRequest } = require('../models/external-request')

var fn = process.env.NODE_ENV === 'test' ? testCheckOLP : checkOLP

module.exports = function (opts, cb) {
  shouldMakeRequest({ name: 'olp', fn, opts }, cb)
}

function checkOLP ({ ip, requestId }, cb) {
  var url = `https://www.oneloanplace.com/api/checkipaddress?ipaddress=${ip}&reqId=${requestId}`

  var options = {
    method: 'post',
    timeout: 1000,
    json: true,
    pool: { maxSockets: Infinity },
    headers: {
      Authorization: 'Basic T3ZlcjIwRmxhdFJhdGVAMjQ3bGVuZGluZ2dyb3VwLmNvbTpQMHNfMjJmODI3YzQ='
    }
  }

  var t0 = Date.now()
  request.get(url, options, function (err, r, body) {
    console.log({
      externalAPI: 'OLP',
      responseTime: Date.now() - t0
    })

    if (err) {
      err.message = 'OLP API: ' + err.message || err.code
      console.warn(err)
      return cb(null, { olpEmails: 0, olpStatus: 'UNIQUE' })
    }

    var response = {
      olpEmails: body.EmailCount,
      olpStatus: body.IsRejected
        ? 'REJECTED'
        : body.EmailCount
          ? 'FOUND'
          : 'UNIQUE'
    }

    cb(null, response)
  })
}

function testCheckOLP ({ ip, requestId }, cb) {
  console.log({
    externalAPI: 'OLP'
  })
  cb(null, {
    olpEmails: 0,
    olpStatus: 'UNIQUE'
  }
  )
}
