var net = require('net')
var levelup = require('levelup')
var through2 = require('through2')
var encode = require('encoding-down')
var multileveldown = require('multileveldown')

var mlOpts = require('../config').multilevel

var env = process.env.NODE_ENV
var db = module.exports = (env === 'production' || mlOpts.force)
  ? createClient(mlOpts)
  : levelup(encode(require('memdown')(), { valueEncoding: 'json' }))

db.healthCheck = function (cb) {
  var healthKey = '!healthCheck'
  var now = Date.now()

  db.put(healthKey, now, function (err) {
    if (err) return cb(err)

    var buf = []
    db.createValueStream({ gte: healthKey, limit: 1 })
      .on('error', cb)
      .on('data', doc => buf.push(doc))
      .on('end', () => now !== buf[0] ? cb(new Error('DB write failed')) : cb())
  })
}

db.reset = function (regex, cb) {
  db
    .createKeyStream()
    .pipe(through2.obj(
      function (key, enc, cb) {
        regex.test(key) ? db.del(key, cb) : cb()
      },
      function onEnd (cb_) {
        cb()
        cb_()
      }
    ))
}

function createClient ({ host, port, valueEncoding }) {
  var db = multileveldown.client({
    retry: true,
    valueEncoding
  })

  function connect () {
    var sock = net.connect({ host, port })

    sock.on('error', function (err) {
      sock.destroy()
      if (err) console.error(err)
    })

    sock.on('close', function () {
      setTimeout(connect, 1000)
    })

    sock.pipe(db.connect()).pipe(sock)
  }

  connect()

  return db
}
