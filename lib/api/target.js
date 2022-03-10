var send = require('send-data/json')
var body = require('body/json')
var cuid = require('cuid')
var async = require('async')
var _ = require('lodash')

var Targets = require('../models/targets')
var TargetRateHistory = require('../models/target-rate-history')

module.exports = {
  getTarget,
  putTarget,
  getTargetHistory,
  listTargets
}

function getTarget (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)

  Targets.get(id, function (err, value) {
    if (err) return cb(err)

    send(req, res, value)
  })
}

function putTarget (req, res, opts, cb) {
  var email = _.get(opts, 'auth.email')

  body(req, res, function (err, target) {
    if (err) return cb(err)

    target.id = target.id || cuid()
    target.modifiedBy = email

    async.parallel({
      targetPut: (cb) => Targets.put(target, cb),
      targetRateHistory: function (cb) {
        if (!target.rateType || !target.rateAmount) return cb()
        TargetRateHistory.put({ targetId: target.id, rateAmount: target.rateAmount, rateType: target.rateType }, cb)
      }
    }, function (err) {
      if (err) return cb(err)

      send(req, res, target)
    })
  })
}

function listTargets (req, res, opts, cb) {
  Targets.list(function (err, targets) {
    if (err) return cb(err)

    send(req, res, targets)
  })
}

function getTargetHistory (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)

  Targets.getTargetHistoryList(id, function (err, value) {
    if (err) return cb(err)

    send(req, res, value)
  })
}
