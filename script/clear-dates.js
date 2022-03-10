var db = require('../lib/level')

deleteRange({ dateStart: '2018-01-01', dateEnd: '2018-12-31' })

function deleteRange ({ dateStart, dateEnd }) {
  var keys = []

  var rs = db.createKeyStream({
    gte: `date-eventId\xff${dateStart}`,
    lte: `date-eventId\xff${dateEnd}\xff\xff`
  })
    .on('data', function (key) {
      keys.push(key)
      if (!(keys.length % 1000)) {
        console.log('keys', keys.length)
        var ops = keys.map(key => ({ type: 'del', key }))
        keys = []
        db.batch(ops, function (err) {
          if (err) return console.error(err)
          console.log(ops.length, 'deleted')
        })
      }
    })
    .on('end', function () {
      console.log('done')
    })

  return rs
}
