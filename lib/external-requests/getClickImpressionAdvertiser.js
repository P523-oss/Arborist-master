var auth = require('../authentic')
var host = require('../../config').AERHost

module.exports = process.env.NODE_ENV === 'test' ? testGetClickImpressionAdvertiser : getClickImpressionAdvertiser

function getClickImpressionAdvertiser ({ accountId, originId, endpointId, date }, cb) {
  var urlAER = host + '/api/query'

  urlAER += '?lte=date-accountId-originId-endpointId\xff'
  urlAER += [date, accountId, originId, endpointId].join('\xff')
  urlAER += '&gte=date-accountId-originId-endpointId\xff'
  urlAER += [date, accountId, originId, endpointId].join('\xff')
  urlAER += '&limit=1&reverse=true'

  var t0 = Date.now()
  var timedOut = false
  var timeout = setTimeout(function () {
    timedOut = true
    console.error(new Error('AER accountId Timeout: ' + urlAER))
    console.log({
      externalAPI: 'aer-accountId-originId-endpointId',
      responseTime: Date.now() - t0
    })
    cb(null, { date: new Date().toISOString().slice(0, 10) })
    cb = function () {}
  }, 3000)
  auth.get(urlAER, function (err, resp) {
    clearTimeout(timeout)
    if (timedOut) return
    console.log({
      externalAPI: 'aer-accountId-originId-endpointId',
      responseTime: Date.now() - t0
    })

    if (err) return cb(err)
    var aer = resp
    var lastTimeSeen = aer ? aer[aer.length - 1] : undefined

    cb(null, lastTimeSeen)
  })
}

function testGetClickImpressionAdvertiser ({ accountId, originId, endpointId, date }, cb) {
  if (originId === '0703jdl' && endpointId === 'arborist' && accountId === 'propper') {
    return cb(null, { date: '2019-09-26', accountId: 'propper', originId: '0703jdl', endpointId: 'arborist', impressionsTotal: 4, clicksTotal: 3 })
  }
  cb(null, {})
}
