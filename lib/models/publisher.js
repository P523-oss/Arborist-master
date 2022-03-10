var map = require('async/map')
var _ = require('lodash')

var db = require('../db')
var {
  checkId, formatModel,
  parseModel
} = require('../utils/process-model-object')

var PUBLISHER_KEY = id => `publisher:${id}`
var PUBLISHER_LIST = 'publishers'

module.exports = {
  get,
  put,
  list,
  find
}

function get (id, cb) {
  var key = PUBLISHER_KEY(id)

  db.hgetall(key, function (err, publisher) {
    if (err) return cb(err)

    if (!publisher) return cb()

    var parsedPublisher = parseModel(publisher)
    cb(null, { id, ...parsedPublisher })
  })
}

function put (publisher, cb) {
  var err = validate(publisher)
  if (err) return cb(err)

  publisher.modifiedAt = new Date().toISOString()
  if (_.isUndefined(publisher.createdAt)) {
    publisher.createdAt = new Date().toISOString()
  }

  var id = publisher.id
  var key = PUBLISHER_KEY(id)
  var args = formatModel(publisher)

  db.multi()
    .del(key)
    .sadd(PUBLISHER_LIST, id)
    .hmset(key, args)
    .exec(function (err) {
      if (err) return cb(err)

      cb(null, { id: id, ...publisher })
    })
}

function list (cb) {
  db.smembers(PUBLISHER_LIST, function (err, list) {
    if (err) return cb(err)
    map(list, get, cb)
  })
}

function find (reqInfo, cb) {
  if (reqInfo.publisher) return get(reqInfo.publisher, cb)
  if (reqInfo.origin) return findPublisherByOrigin(reqInfo, cb)

  return cb(null)
}

function findPublisherByOrigin (reqInfo, cb) {
  if (!reqInfo.origin) return cb(null)

  list(function (err, publishers) {
    if (err) return cb(err)
    var response = publishers.find(publisher =>
      Object.keys(publisher.origins || {}).includes(reqInfo.origin))
    cb(null, response)
  })
}

function validate (publisher) {
  var err = null

  var idValidation = checkId(publisher.id, 'publisher')
  if (idValidation) return idValidation

  return err
}
