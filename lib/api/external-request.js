var _ = require('lodash')
var body = require('body/json')
var send = require('send-data/json')

var ExternalRequests = require('../models/external-request')

module.exports = {
  get,
  put,
  list
}

function get (req, res, opts, cb) {
  var id = opts.params.name
  ExternalRequests.get(id, function (err, externalRequest) {
    if (err) return cb(err)

    send(req, res, externalRequest)
  })
}

function put (req, res, opts, cb) {
  var email = _.get(opts, 'auth.email')

  body(req, res, function (err, request) {
    if (err) return cb(err)

    request.modifiedBy = email
    ExternalRequests.put(request, function (err) {
      if (err) return cb(err)

      send(req, res, request)
    })
  })
}

function list (req, res, opts, cb) {
  ExternalRequests.list(function (err, list) {
    if (err) return cb(err)

    send(req, res, list)
  })
}
