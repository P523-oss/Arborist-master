var map = require('async/map')
var _ = require('lodash')

var db = require('../db')
var Targets = require('./targets')
var {
  checkId, formatModel,
  parseModel
} = require('../utils/process-model-object')

var ADVERTISER_KEY = id => `advertiser:${id}`
var ADVERTISER_LIST = 'advertisers'

module.exports = {
  get,
  put,
  list
}

function get (id, cb) {
  var key = ADVERTISER_KEY(id)

  db.hgetall(key, function (err, advertiser) {
    if (err) return cb(err)

    if (!advertiser) return cb()

    var parsedAdvertiser = parseModel(advertiser)
    syncAdvertiserTargets(parsedAdvertiser.targets || [], function (err, targets) {
      if (err) return cb(err)

      parsedAdvertiser.targets = targets
      cb(null, { id, ...parsedAdvertiser })
    })
  })
}

function put (advertiser, cb) {
  var err = validate(advertiser)
  if (err) return cb(err)

  advertiser.modifiedAt = new Date().toISOString()

  if (_.isUndefined(advertiser.createdAt)) {
    advertiser.createdAt = new Date().toISOString()
  }

  var id = advertiser.id
  var key = ADVERTISER_KEY(id)
  var args = formatModel(advertiser)

  db.multi()
    .del(key)
    .sadd(ADVERTISER_LIST, id)
    .hmset(key, args)
    .exec(function (err) {
      if (err) return cb(err)

      cb(null, { id: id, ...advertiser })
    })
}

function list (cb) {
  db.smembers(ADVERTISER_LIST, function (err, list) {
    if (err) return cb(err)
    map(list, get, cb)
  })
}

function validate (advertiser) {
  var err = null

  var idValidation = checkId(advertiser.id, 'advertiser')
  if (idValidation) return idValidation

  return err
}

function syncAdvertiserTargets (targets, cb) {
  map(targets, function (target, cb) {
    Targets.get(target.id, cb)
  }, function (err, targets) {
    if (err) return cb(err)
    cb(null, targets)
  })
}
