var async = require('async')

var Events = require('./models/events')
var log = require('./utils/log')
module.exports = function recordVisit ({ target, criteria, id }, cb) {
  log({ criteria, target, requestId: id })

  return async.parallel({
    eventResponse: (cb) => Events.put({
      type: 'visit',
      ...(target && { targetId: target.id }),
      ...(target && { targetUrl: target.url }),
      ...(target && { targetEndpoint: target.endpoint }),
      ...(target && { targetOrigin: target.origin }),
      ...(target && { targetCpc: target.cpc }),
      ...(target && { targetScore: target.score }),
      ...(target && { targetName: target.name || target.id }),
      ...target,
      ...criteria
    }, cb)
  }, cb)
}
