var _ = require('lodash')
var async = require('async')
var db = require('../db')
var isSubstring = require('../utils/isWildCardSubstring')
var {
  checkId, isObject,
  formatModel, parseModel
} = require('../utils/process-model-object')

var ORIGIN_KEY = id => `origin-reject:${id}`
var ORIGIN_LIST_KEY = 'origin-reject-list'

module.exports = {
  putOriginSubid,
  getOriginSubid,
  deleteOriginSubid,
  list,
  checkOriginSubidReject
}

function getOriginSubid (id, cb) {
  var key = ORIGIN_KEY(id)

  db.hgetall(key, function (err, object) {
    if (err) return cb(err)
    if (!object) return cb(null, {})
    var parsedObject = parseModel(object)

    cb(null, { id, ...parsedObject })
  })
}

function deleteOriginSubid (id, cb) {
  var key = ORIGIN_KEY(id)

  db.multi()
    .del(key)
    .SREM(ORIGIN_LIST_KEY, id)
    .exec(cb)
}

function putOriginSubid (object, cb) {
  var err = validate(object)
  if (err) return cb(err)

  object.modifiedAt = new Date().toISOString()

  if (_.isUndefined(object.createdAt)) {
    object.createdAt = new Date().toISOString()
  }

  var id = (object || {}).id

  var key = ORIGIN_KEY(id)
  var args = formatModel(object)

  db.multi()
    .del(key)
    .sadd(ORIGIN_LIST_KEY, id)
    .hmset(key, args)
    .exec(function (err) {
      if (err) return cb(err)

      cb(null, { id: id, ...object })
    })
}

function list (cb) {
  db.smembers(ORIGIN_LIST_KEY, function (err, ids) {
    if (err) return cb(err)

    async.map(ids, getOriginSubid, cb)
  })
}

function checkOriginSubidReject ({ origin, subid }, cb) {
  getOriginSubid(origin, function (err, object) {
    if (err) return cb(err)
    if (!object) return cb(null, false)

    var shouldReject = (object.subids || [])
      .find(objectForSubid => isSubstring(objectForSubid.id, subid))
    return cb(null, !!shouldReject)
  })
}
function validate (object) {
  var err = null

  var objectValidation = isObject(object, 'request')
  if (objectValidation) return objectValidation

  var idValidation = checkId(object.id, 'template')
  if (idValidation) return idValidation

  return err
}
