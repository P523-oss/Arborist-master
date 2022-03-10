var _ = require('lodash')
var body = require('body/json')
var send = require('send-data/json')
var async = require('async')

var Templates = require('../models/templates')
var Targets = require('../models/targets')

module.exports = {
  putTemplate,
  getTemplate,
  listTemplates
}

function putTemplate (req, res, opts, cb) {
  var email = _.get(opts, 'auth.email')

  body(req, res, function (err, template) {
    if (err) return cb(err)
    template.modifiedBy = email

    Targets.list(function (err, targets) {
      if (err) return cb(err)

      async.each(
        targets
          .filter(t => t.templateId === template.id)
          .map(t => {
            t.template = template.value
            return t
          })
        ,
        Targets.put,
        function (err) {
          if (err) return cb(err)

          Templates.put(template, function (err) {
            if (err) return cb(err)
            send(req, res, template)
          })
        }
      )
    })
  })
}

function getTemplate (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)
  Templates.get(id, function (err, template) {
    if (err) return cb(err)

    send(req, res, template)
  })
}

function listTemplates (req, res, opts, cb) {
  Templates.list(function (err, list) {
    if (err) return cb(err)
    send(req, res, list)
  })
}
