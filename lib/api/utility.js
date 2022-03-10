var getParser = require('../utils/get-parser')
var xml2js = require('xml2js')
var send = require('send-data/json')

var xmlBuilder = new xml2js.Builder({ rootName: 'response' })
var getSender = require('../utils/get-sender')
var uiCriteria = require('../utils/ui-criteria')

module.exports = {
  echo,
  criteria
}

function echo (req, res, opts, cb) {
  var { output = 'json' } = opts.query

  var parser = getParser(req)

  parser(req, res, function (err, reqInfo) {
    if (err) return cb(err)

    if (output === 'xml') {
      reqInfo = xmlBuilder.buildObject(reqInfo)
      res.setHeader('Content-Type', 'text/xml')
    }
    var sender = getSender(output)
    sender(req, res, reqInfo)
  })
}

function criteria (req, res) {
  send(req, res, uiCriteria)
}
