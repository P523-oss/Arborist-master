var auth = require('../authentic')

module.exports = process.env.NODE_ENV === 'test' ? testCheckIp : checkIp

function checkIp ({ ip, requestId }, cb) {
  var dateEnd = new Date(Date.now() + (24 * 3600 * 1000))
    .toISOString().slice(0, 10)

  var dateStart = new Date(Date.now() + (24 * 3600 * 1000))
  dateStart.setFullYear(dateStart.getFullYear() - 1)
  dateStart = dateStart.toISOString().slice(0, 10)

  var host = 'https://ad-event-reports.lincx.la'

  var urlAER = host + '/api/query'

  urlAER += '?lte=ip-date-accountId-originId-endpointId\xff'
  urlAER += [ip, dateEnd].join('\xff')
  urlAER += '&gte=ip-date-accountId-originId-endpointId\xff'
  urlAER += [ip, dateStart].join('\xff')
  urlAER += '&limit=1&reverse=true'
  urlAER += `&reqId=${requestId}`

  var t0 = Date.now()

  var timedOut = false
  var timeout = setTimeout(function () {
    timedOut = true
    console.error(new Error('AER Timeout: ' + urlAER))
    console.log({
      externalAPI: 'aer-ip',
      responseTime: Date.now() - t0
    })
    cb(null, { date: new Date().toISOString().slice(0, 10) })
    cb = function () {}
  }, 3000)

  auth.get(urlAER, function (err, resp) {
    clearTimeout(timeout)
    if (timedOut) return

    console.log({
      externalAPI: 'aer-ip',
      responseTime: Date.now() - t0
    })

    if (err) return cb(err)
    var aer = resp
    var lastTimeSeen = aer ? aer[aer.length - 1] : undefined
    cb(null, lastTimeSeen)
  })
}

function testCheckIp ({ ip, requestId }, cb) {
  var date = new Date()
  date.setDate(date.getDate() - 1)
  cb(null, undefined)
}
