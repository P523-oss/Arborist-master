var RejectOriginSubid = require('../models/reject-origin-subid')

module.exports = function checkOriginSubidReject ({ origin, subid }, cb) {
  if (!origin || !subid) return cb()

  RejectOriginSubid.checkOriginSubidReject({ origin, subid }, function (err, shouldReject) {
    if (err) return cb(err, {})
    if (shouldReject) {
      console.info(`this pair - origin:${origin} and subid:${origin} in rejected list`)
      return cb(null, shouldReject)
    }
    cb()
  })
}
