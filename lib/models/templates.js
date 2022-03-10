var map = require('async/map')
var _ = require('lodash')
var URL = require('url').URL

var db = require('../db')
var { formatModel, parseModel } = require('../utils/process-model-object')

var TEMPLATE_KEY = id => `template:${id}`
var TEMPLATE_LIST_KEY = 'templates'

module.exports = {
  get,
  list,
  put
}

function get (id, cb) {
  var key = TEMPLATE_KEY(id)

  db.hgetall(key, function (err, template) {
    if (err) return cb(err)
    if (!template) return cb()

    var parsedTemplate = parseModel(template)
    cb(null, { id, ...parsedTemplate })
  })
}

function put (template, cb) {
  var err = validate(template)
  if (err) return cb(err)

  template.modifiedAt = new Date().toISOString()

  if (_.isUndefined(template.createdAt)) {
    template.createdAt = new Date().toISOString()
  }

  var id = (template || {}).id
  var key = TEMPLATE_KEY(id)
  var args = formatModel(template)
  db.multi()
    .del(key)
    .sadd(TEMPLATE_LIST_KEY, id)
    .hmset(key, args)
    .exec(function (err) {
      if (err) return cb(err)

      cb(null, { id: id, ...template })
    })
}

function list (cb) {
  db.smembers(TEMPLATE_LIST_KEY, function (err, ids) {
    if (err) return cb(err)
    map(ids, get, cb)
  })
}

function validate (template) {
  var err = null

  if (template.value && (typeof template.value !== 'string')) {
    err = new Error('template value must be string')
    err.type = 'validation'
    return err
  }

  if (template.id && (typeof template.id !== 'string')) {
    err = new Error('template id must be string')
    err.type = 'validation'
    return err
  }

  if (template.value && !stringIsAValidUrl(template.value)) {
    err = new Error('template value is not valid')
    err.type = 'validation'
    return err
  }

  if (template.value && !checkTemplateBracket(template.value)) {
    err = new Error('template URL\'s brackets validation failed')
    err.type = 'validation'
    return err
  }

  return err
}

function stringIsAValidUrl (string) {
  try {
    var url = new URL(string)
    return !!url
  } catch (err) {
    return false
  }
}

function checkTemplateBracket (expr) {
  const holder = []
  const openBrackets = ['{']
  const closedBrackets = ['}']
  for (const letter of expr) {
    if (openBrackets.includes(letter)) {
      holder.push(letter)
    } else if (closedBrackets.includes(letter)) {
      const openPair = openBrackets[closedBrackets.indexOf(letter)]
      if (holder[holder.length - 1] === openPair) {
        holder.splice(-1, 1)
      } else {
        holder.push(letter)
        break
      }
    }
  }
  return (holder.length === 0)
}
