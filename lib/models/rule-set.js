var map = require('async/map')
var _ = require('lodash')

var db = require('../db')
var {
  checkId, formatModel,
  parseModel
} = require('../utils/process-model-object')

var RULESET_KEY = id => `ruleSet:${id}`
var RULESET_LIST = 'ruleSets'

module.exports = {
  get,
  put,
  list,
  listWithIds
}

function get (id, cb) {
  var key = RULESET_KEY(id)

  db.hgetall(key, function (err, ruleSet) {
    if (err) return cb(err)

    if (!ruleSet) return cb()

    var parsedRuleSet = parseModel(ruleSet)
    cb(null, { id, ...parsedRuleSet })
  })
}

function put (ruleSet, cb) {
  var err = validate(ruleSet)
  if (err) return cb(err)

  ruleSet.modifiedAt = new Date().toISOString()

  if (_.isUndefined(ruleSet.createdAt)) {
    ruleSet.createdAt = new Date().toISOString()
  }

  var id = ruleSet.id
  var key = RULESET_KEY(id)
  var args = formatModel(ruleSet)

  db.multi()
    .del(key)
    .sadd(RULESET_LIST, id)
    .hmset(key, args)
    .exec(function (err) {
      if (err) return cb(err)

      cb(null, { id: id, ...ruleSet })
    })
}

function list (cb) {
  db.smembers(RULESET_LIST, function (err, list) {
    if (err) return cb(err)
    map(list, get, cb)
  })
}

function listWithIds (ids, cb) {
  map(ids, get, cb)
}

function validate (ruleSet) {
  var err = null

  var idValidation = checkId(ruleSet.id, 'rule set')
  if (idValidation) return idValidation

  return err
}
