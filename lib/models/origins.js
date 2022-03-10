var map = require('async/map')
var _ = require('lodash')
var slug = require('cuid').slug

var db = require('../db')
var Publishers = require('./publisher')
var {
  checkId, formatModel,
  parseModel
} = require('../utils/process-model-object')

var ORIGIN_KEY = id => `origin:${id}`
var ORIGIN_LIST = 'origins'

module.exports = {
  get,
  put,
  remove,
  list
}

function get (id, cb) {
  var key = ORIGIN_KEY(id)

  db.hgetall(key, function (err, origin) {
    if (err) return cb(err)

    if (!origin) return cb()

    var parsedOrigin = parseModel(origin)

    Publishers.get(parsedOrigin.publisherId, function (err, publisher) {
      if (err) return cb(err)
      parsedOrigin.publisher = publisher

      cb(null, { id, ...parsedOrigin })
    })
  })
}

function remove (id, cb) {
  var key = ORIGIN_KEY(id)
  db.multi()
    .del(key)
    .srem(ORIGIN_LIST, id)
    .exec(function (err) {
      if (err) return cb(err)

      cb(null)
    })
}

function put (origin, cb) {
  if (!origin.id) {
    origin.id = slug()
  }
  var err = validate(origin)
  if (err) return cb(err)

  origin.modifiedAt = new Date().toISOString()

  if (_.isUndefined(origin.createdAt)) {
    origin.createdAt = new Date().toISOString()
  }

  var id = origin.id
  var key = ORIGIN_KEY(id)
  var args = formatModel(origin)

  db.multi()
    .del(key)
    .sadd(ORIGIN_LIST, id)
    .hmset(key, args)
    .exec(function (err) {
      if (err) return cb(err)

      cb(null, { id: id, ...origin })
    })
}

function list (cb) {
  db.smembers(ORIGIN_LIST, function (err, list) {
    if (err) return cb(err)
    map(list, get, cb)
  })
}

function validate (origin) {
  var err = null

  var idValidation = checkId(origin.id, 'origin')
  if (idValidation) return idValidation

  return err
}
