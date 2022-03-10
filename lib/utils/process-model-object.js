var _ = require('lodash')

module.exports = {
  formatModel,
  parseModel,
  checkId,
  isObject
}

function formatModel (model) {
  var args = []
  Object.keys(model).forEach(function (property) {
    args.push(property, JSON.stringify(model[property]))
  })

  return args
}

function parseModel (model) {
  var parsedModel = {}

  Object.keys(model).forEach(function (property) {
    parsedModel[property] = JSON.parse(model[property])
  })

  return parsedModel
}

function checkId (id, modelName = 'model') {
  var err
  if (!_.isString(id)) {
    err = new Error(`${modelName} id must be string`)
    err.type = 'validation'
    return err
  }

  return null
}

function isObject (model, modelName = 'model') {
  var err
  if (!_.isObject(model)) {
    err = new Error(`${modelName} must be an object`)
    err.type = 'validation'
    return err
  }

  return null
}
