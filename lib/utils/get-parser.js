
var bodyForm = require('body/form')
var body = require('body/json')

module.exports = function getParser (req) {
  return (req.headers['content-type'] === 'application/x-www-form-urlencoded')
    ? bodyForm : body
}
