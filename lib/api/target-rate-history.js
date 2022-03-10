var send = require('send-data/json')
var body = require('body/json')

var TargetRateHistory = require('../models/target-rate-history')

module.exports = {
  getTargetRateHistory,
  putTargetRateHistory
}

function getTargetRateHistory (req, res, opts, cb) {
  var { targetId, date } = opts.query || {}

  TargetRateHistory.get({ targetId, date }, function (err, response) {
    if (err) return cb(err)

    send(req, res, response)
  })
}

function putTargetRateHistory (req, res, opts, cb) {
  body(req, res, function (err, { targetId, rateAmount, rateType }) {
    if (err) return cb(err)
    TargetRateHistory.put({ targetId, rateAmount, rateType }, function (err) {
      if (err) return cb(err)

      send(req, res, { targetId, rateAmount, rateType })
    })
  })
}
