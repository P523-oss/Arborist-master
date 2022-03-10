var _ = require('lodash')
var isSubstring = require('../utils/isWildCardSubstring')

var operators = {
  $lt: (valCriteria, valTarget) => Number(valCriteria) < Number(valTarget),
  $lte: (valCriteria, valTarget) => Number(valCriteria) <= Number(valTarget),
  $gt: (valCriteria, valTarget) => Number(valCriteria) > Number(valTarget),
  $gte: (valCriteria, valTarget) => Number(valCriteria) >= Number(valTarget),
  $eq: (valCriteria, valTarget) => valCriteria === valTarget,
  $ne: (valCriteria, valTarget) => valCriteria !== valTarget,
  $in: (valCriteria, valTarget) => valTarget && valTarget.find && !_.isUndefined(valTarget.find(
    c => stringEq(valCriteria, c)
  )),
  $nin: (valCriteria, valTarget) => _.isUndefined(valTarget.find(
    c => stringEq(valCriteria, c)
  )),
  $exists: (valCriteria, valTarget) => decideTruthy(valCriteria, valTarget),
  $subin: (valCriteria, valTarget) => {
    if (!valTarget.length) return false
    return !_.isUndefined(valTarget.find(value => isSubstring(value, valCriteria)))
  },
  $subnin: (valCriteria, valTarget) => {
    return _.isUndefined(valTarget.find(value => isSubstring(value, valCriteria)))
  }
}

module.exports = function filterTargets (targets, criteria) {
  return targets.filter(function (target) {
    if (doesTargetTrafficFit(target)) return false

    if (doesPublishersFit(target, criteria)) return true

    return doesTargetFit(updateTargetRules(target), criteria)
  })
}

function doesTargetFit (target, criteria) {
  var accept = true

  _.forEach(target.accept, function (rules, cKey) {
    _.forEach(rules, function (valTarget, op) {
      var fn = operators[op]
      if (_.isUndefined(fn)) return
      var valCriteria = criteria[cKey]
      if (cKey === 'nDaysLastSeenTarget') {
        valCriteria = criteria[`nDaysLastSeenTarget:${target.id}`] || Infinity
      }
      if (cKey === 'uniqueDailyIP') {
        valCriteria = getValueOrTrue(criteria[`uniqueDailyIP:${target.id}`])
      }
      try {
        if (!fn(valCriteria, valTarget)) accept = false
      } catch (e) {
        console.error({
          target: target,
          message: `wrong type for rule ${cKey} and ${op}`
        })
      }
    })
  })
  return accept
}

function doesPublishersFit (target, criteria) {
  var targetCopy = _.cloneDeep(target)
  var accept = false

  _.forEach(target.publishers || [], function (publisher) {
    if (!doesPublisherTierAndOriginFitAcceptRules(target, publisher)) return

    if (!publisher || publisher.traffic >= publisher.maxAcceptsPerDay) return
    if (accept) return accept
    var newRules = createRules(publisher)
    targetCopy.accept = Object.assign({}, target.accept, newRules)
    accept = doesTargetFit(targetCopy, criteria)
    if (accept) publisher.incr = true
  })

  return accept
}

function updateTargetRules (target) {
  var targetCopy = _.cloneDeep(target)

  var pub$nin = []
  var tier1$nin = []
  _.forEach(target.publishers || [], function (publisher) {
    pub$nin.push(publisher.publisherId)
    tier1$nin.push(publisher.publisherId)
  })

  var publisher$nin = _.get(targetCopy, 'accept.publisher.$nin')
  var tier2$nin = _.get(targetCopy, 'accept.tier.$nin')
  publisher$nin = _.union(publisher$nin || [], pub$nin)
  tier1$nin = _.union(tier2$nin || [], tier1$nin)

  _.set(targetCopy, 'accept.publisher.$nin', publisher$nin)
  _.set(targetCopy, 'accept.tier.$nin', tier1$nin)
  return targetCopy
}

function doesTargetTrafficFit (target) {
  return !target || (!_.isUndefined(target.maxAcceptsPerDay) && target.traffic >= target.maxAcceptsPerDay)
}

function stringEq (a, b) {
  return _.toString(b).toLowerCase() === _.toString(a).toLowerCase()
}

function createRules (publisher) {
  var response = {}
  response.publisher = { $eq: publisher.publisherId }
  if (publisher.tier) response.tier = { $eq: publisher.tier }
  if (publisher.origin) response.origin = { $eq: publisher.origin }

  return response
}

function getValueOrTrue (value) {
  return !_.isUndefined(value) ? value : true
}

function decideTruthy (valCriteria, valTarget) {
  if (valTarget && valCriteria) return true
  if (!valTarget && !valCriteria) return true
  return false
}

function doesPublisherTierAndOriginFitAcceptRules (target, publisher) {
  if (!doesRuleFitTarget(target, publisher.tier, 'tier')) return false
  if (!doesRuleFitTarget(target, publisher.origin, 'origin')) return false
  return true
}

function doesRuleFitTarget (target, value, rule) {
  if (!value) return true

  var available = []
  var excluded = []
  var $in = _.get(target, `accept.${rule}.$in`)
  if ($in) available = $in

  var $eq = _.get(target, `accept.${rule}.$eq`)
  if ($eq) available.push($eq)

  var $nin = _.get(target, `accept.${rule}.$nin`)
  if ($nin) excluded = $nin
  if (available.length !== 0 && !available.includes(value)) return false
  if (excluded.length !== 0 && excluded.includes(value)) return false

  return true
}
