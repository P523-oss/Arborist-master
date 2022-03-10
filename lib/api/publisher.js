var send = require('send-data/json')
var _ = require('lodash')
var body = require('body/json')
var cuid = require('cuid')
var async = require('async')

var Publishers = require('../models/publisher')
var Origins = require('../models/origins')
var { formatOwnerAccessListEmail, validateOwnerAccessList } = require('../utils/accessListFunctions')

module.exports = {
  getPublisher,
  putPublisher,
  listPublishers
}

function getPublisher (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)
  Publishers.get(id, function (err, publisher) {
    if (err) return cb(err)

    send(req, res, publisher)
  })
}

function putPublisher (req, res, opts, cb) {
  var email = _.get(opts, 'auth.email')
  body(req, res, function (err, publisher) {
    if (err) return cb(err)
    publisher.modifiedBy = email
    publisher.id = publisher.id || cuid()
    const formattedPublisher = formatOwnerAccessListEmail(publisher)
    const inValidRes = validateOwnerAccessList(formattedPublisher)
    if (inValidRes) return cb(inValidRes)
    var origins = Object.keys(publisher.origins || {})
    async.parallel({
      origins: cb => async.map(origins, function (originId, cb) {
        var origin = publisher.origins[originId]
        origin.publisherId = publisher.id
        origin.modifiedBy = email
        Origins.put(origin, cb)
      }, cb),
      publisher: cb => Publishers.put(formattedPublisher, cb)
    }, function (err) {
      if (err) return cb(err)
      send(req, res, formattedPublisher)
    })
  })
}

function listPublishers (req, res, opts, cb) {
  Publishers.list(function (err, list) {
    if (err) return cb(err)
    send(req, res, list)
  })
}
