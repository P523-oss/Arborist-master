process.env.UV_THREADPOOL_SIZE = 128
require('http').globalAgent.maxSockets = Infinity

var name = require('./package.json').name
require('productionize')(name)

var server = require('./lib/server')
var port = process.env.PORT || 5000
server().listen(port)
console.error(name, 'listening on port', port)

require('blocked')(function (ms) {
  console.log({ blocked: ms })
}, { threshold: 20 })
