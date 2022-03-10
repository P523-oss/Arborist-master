var _ = require('lodash')
var body = require('body/json')
var send = require('send-data/json')
var async = require('async')

var Origins = require('../models/origins')
var Publishers = require('../models/publisher')

module.exports = {
  putOrigin,
  getOrigin,
  removeOrigin,
  listOrigins
}

function putOrigin (req, res, opts, cb) {
  var email = _.get(opts, 'auth.email')

  body(req, res, function (err, origin) {
    if (err) return cb(err)
    origin.modifiedBy = email
    var errResponse = {
      message: 'specify publisherId field',
      statusCode: 404
    }

    if (!origin.publisherId) return cb(errResponse)
    Publishers.get(origin.publisherId, function (err, publisher) {
      if (err) return cb(err)
      errResponse.message = 'publisher doesn\'t exist'
      if (!publisher) return cb(errResponse)
      Origins.put(origin, function (err, origin) {
        if (err) return cb(err)

        if (!publisher.origins) publisher.origins = {}
        publisher.origins[origin.id] = origin
        Publishers.put(publisher, function (err) {
          if (err) return cb(err)

          Origins.get(origin.id, function (err, origin) {
            if (err) return cb(err)

            send(req, res, origin)
          })
        })
      })
    })
  })
}

function getOrigin (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)
  Origins.get(id, function (err, origin) {
    if (err) return cb(err)

    send(req, res, origin)
  })
}

function removeOrigin (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)

  Origins.get(id, function (err, origin) {
    if (err) return cb(err)

    if (!origin) {
      var errResponse = {
        message: 'Origin doesn\'t exist',
        success: false
      }
      return send(req, res, { statusCode: 404, body: errResponse })
    }

    if (!origin.publisherId) {
      return Origins.remove(id, function (err) {
        if (err) return cb(err)

        send(req, res, { success: true })
      })
    }
    async.parallel({
      remove: cb => Origins.remove(id, cb),
      publisher: cb => Publishers.get(origin.publisherId, cb)
    }, function (err, { publisher }) {
      if (err) return cb(err)

      if (publisher && publisher.origins) delete publisher.origins[id]

      if (!publisher) send(req, res, { success: true })

      Publishers.put(publisher, function (err) {
        if (err) return cb(err)

        send(req, res, { success: true })
      })
    })
  })
}

function listOrigins (req, res, opts, cb) {
  Origins.list(function (err, list) {
    if (err) return cb(err)
    send(req, res, list)
  })
}
