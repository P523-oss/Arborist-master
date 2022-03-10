#!/usr/bin/env node

var pump = require('pump')
var through = require('through2').obj

var dbSource = require('../lib/level')
var dbTarget = require('../lib/multilevel')

var { dateStart, dateEnd } = require('yargs')
  .scriptName('db-migrate')
  .usage('$0 <cmd> [args]')
  .option('dateStart', {
    demandOption: true,
    describe: 'start date of migration',
    defaultDescription: new Date().toISOString().slice(0, 10),
    type: 'string'
  })
  .option('dateEnd', {
    demandOption: true,
    describe: 'end date of migration',
    defaultDescription: new Date().toISOString().slice(0, 10),
    type: 'string'
  })
  .help()
  .argv

deleteRange({ dateStart, dateEnd })

function deleteRange ({ dateStart, dateEnd }) {
  pump(
    dbSource.createReadStream({
      gte: `date-eventId\xff${dateStart}`,
      lte: `date-eventId\xff${dateEnd}\xff\xff`
    }),
    migrateStream(),
    function (err) {
      if (err) return console.error(err)
      console.log('DONE')
    }
  )
}

function migrateStream () {
  var batchSize = 2e3
  var buf = []

  return through(onData, flush)

  function onData (doc, enc, cb) {
    buf.push(doc)

    return (buf.length % batchSize) ? cb() : flush(cb)
  }

  function flush (cb) {
    if (!buf.length) return cb()

    var first = buf[0].key
    var last = buf[buf.length - 1].key

    var opsSource = buf.map(({ key }) => ({ type: 'del', key }))
    var opsTarget = buf.map(({ key, value }) => ({ type: 'put', key, value }))
    buf = []

    dbTarget.batch(opsTarget, function (err) {
    // testBatch(opsTarget, function (err) {
      if (err) return cb(err)

      dbSource.batch(opsSource, function (err) {
      // testBatch(opsSource, function (err) {
        if (err) return cb(err)

        console.log(`xfer: ${first} - ${last}`)

        cb()
      })
    })
  }
}
//
// function testBatch (ops, cb) {
//   console.log(ops)
//   cb()
// }
