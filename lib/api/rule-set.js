var cuid = require('cuid')
var _ = require('lodash')
var body = require('body/json')
var send = require('send-data/json')

var RuleSets = require('../models/rule-set')

module.exports = {
  getRuleSet,
  putRuleSet,
  listRuleSets
}

function getRuleSet (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)
  RuleSets.get(id, function (err, ruleSet) {
    if (err) return cb(err)

    send(req, res, ruleSet)
  })
}

function putRuleSet (req, res, opts, cb) {
  var email = _.get(opts, 'auth.email')

  body(req, res, function (err, ruleSet) {
    if (err) return cb(err)
    ruleSet.modifiedBy = email
    ruleSet.id = ruleSet.id || cuid()
    RuleSets.put(ruleSet, function (err) {
      if (err) return cb(err)

      send(req, res, ruleSet)
    })
  })
}

function listRuleSets (req, res, opts, cb) {
  RuleSets.list(function (err, list) {
    if (err) return cb(err)
    send(req, res, list)
  })
}
