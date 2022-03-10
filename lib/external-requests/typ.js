var get = require('lodash').get
var jsonist = require('jsonist')

var logError = require('../utils/log-error')

module.exports = {
  convertId: process.env.NODE_ENV === 'test' ? testConvertId : convertId
}

function convertId ({ longId }, cb) {
  var url = `https://tipin.lincx.la/thankyou/convert_site_id?long_id=${longId}`

  var t0 = Date.now()
  jsonist.get(url, function (err, ids) {
    console.log({
      externalAPI: 'Tipin',
      responseTime: Date.now() - t0
    })

    if (err) {
      err.message = 'Tipin: ' + err.message || err.code
      logError(err)
      return cb(null, {})
    }

    cb(null, {
      short_id: get(ids, 'data.short_id', '').toString(),
      long_id: get(ids, 'data.long_id', '').toString()
    })
  })
}

function testConvertId ({ longId }, cb) {
  if (longId === '3ab9a49350-df4b45aef1-b3724a213b-497e855ee7') {
    return cb(null, {
      long_id: '3ab9a49350-df4b45aef1-b3724a213b-497e855ee7',
      short_id: 1042
    })
  }
  cb(null, {})
}
