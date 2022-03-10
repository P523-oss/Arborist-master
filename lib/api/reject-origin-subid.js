var _ = require('lodash')
var body = require('body/json')
var send = require('send-data/json')

var RejectOriginSubid = require('../models/reject-origin-subid')

module.exports = {
  getOriginSubid,
  deleteOriginSubid,
  putOriginSubid,
  listReject
}

function getOriginSubid (req, res, opts, cb) {
  var id = opts.params.id
  RejectOriginSubid.getOriginSubid(id, function (err, object) {
    if (err) return cb(err)

    send(req, res, object)
  })
}

function deleteOriginSubid (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)
  RejectOriginSubid.deleteOriginSubid(id, function (err) {
    if (err) return cb(err)

    send(req, res, { message: 'success' })
  })
}

function putOriginSubid (req, res, opts, cb) {
  var email = _.get(opts, 'auth.email')

  body(req, res, function (err, object) {
    if (err) return cb(err)

    object.modifiedBy = email
    RejectOriginSubid.putOriginSubid(object, function (err) {
      if (err) return cb(err)

      send(req, res, object)
    })
  })
}

function listReject (req, res, opts, cb) {
  RejectOriginSubid.list(function (err, list) {
    if (err) return cb(err)

    send(req, res, list)
  })
}
