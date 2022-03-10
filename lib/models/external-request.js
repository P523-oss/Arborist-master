var map = require('async/map')
var _ = require('lodash')

var db = require('../db')
var EXTERNAL_REQUEST_LIST = require('../utils/external-request-list')
var {
  checkId, isObject,
  formatModel, parseModel
} = require('../utils/process-model-object')
var EXTERNAL_REQUEST_KEY = id => `externalRequest:${id}`

module.exports = {
  get,
  put,
  shouldMakeRequest,
  list
}

function get (id, cb) {
  var key = EXTERNAL_REQUEST_KEY(id)

  db.hgetall(key, function (err, externalRequest) {
    if (err) return cb(err)

    if (!externalRequest) return cb()

    var parsedRequest = parseModel(externalRequest)
    cb(null, { id, ...parsedRequest })
  })
}

function put (externalRequest, cb) {
  var err = validate(externalRequest)
  if (err) return cb(err)

  externalRequest.modifiedAt = new Date().toISOString()

  if (_.isUndefined(externalRequest.createdAt)) {
    externalRequest.createdAt = new Date().toISOString()
  }

  var id = externalRequest.id
  var key = EXTERNAL_REQUEST_KEY(id)
  var args = formatModel(externalRequest)

  db.multi()
    .del(key)
    .hmset(key, args)
    .exec(function (err) {
      if (err) return cb(err)

      cb(null, { id: id, ...externalRequest })
    })
}

function list (cb) {
  map(
    EXTERNAL_REQUEST_LIST,
    function (externalRequest, cb) {
      get(externalRequest, function (err, object) {
        if (err) return cb(err)
        if (!object) return cb(null, { id: externalRequest })

        cb(null, object)
      })
    },
    cb
  )
}

function shouldMakeRequest ({ name, fn, opts }, cb) {
  get(name, function (err, request) {
    if (err) return cb(err)
    if (!request || !(request || {}).disabled) return fn(opts, cb)

    return cb(null)
  })
}

function validate (externalRequest) {
  var err = null

  var objectValidation = isObject(externalRequest, 'request')
  if (objectValidation) return objectValidation

  var idValidation = checkId(externalRequest.id, 'request')
  if (idValidation) return idValidation

  return err
}
