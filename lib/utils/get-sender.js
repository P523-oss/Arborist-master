var sendPlain = require('send-data')
var send = require('send-data/json')

module.exports = function getSender (output) {
  return (output === 'xml') ? sendPlain : send
}
