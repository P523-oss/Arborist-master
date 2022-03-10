var request = require('request')

var ItMediaUsername = require('../../config').itMedia.username
var ItMediaPassword = require('../../config').itMedia.password
var { shouldMakeRequest } = require('../models/external-request')

var fn = process.env.NODE_ENV === 'test' ? testItMedia : checkItMedia

module.exports = function (opts, cb) {
  shouldMakeRequest({ name: 'itMediaCheck', fn, opts }, cb)
}

function checkItMedia ({ ip, requestId }, cb) {
  const url = `https://api-v2.itmedia.xyz/api/v1/ip-lookup/${ip}`
  var options = {
    method: 'get',
    qs: { reqId: requestId },
    url,
    timeout: 1000,
    json: true,
    pool: { maxSockets: Infinity },
    auth: {
      username: ItMediaUsername,
      password: ItMediaPassword
    },
    headers: {
      'Content-Type': 'application/json'
    }
  }

  var t0 = Date.now()
  request(options, function (err, r, body) {
    console.log({
      externalAPI: 'It Media',
      responseTime: Date.now() - t0,
      externalIp: { response: body, request: options.qs }
    })

    if (err) {
      err.message = `It Media API: ${err.message || err.code} ${requestId}`
      console.log(err)
      return cb(null)
    }
    if (body && body.status) return cb(null, body.status)
    cb(null)
  })
}

function testItMedia ({ ip, requestId }, cb) {
  cb(null, 'ok')
}
