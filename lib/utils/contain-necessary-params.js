
var _ = require('lodash')

module.exports = function containsNecessaryParams ({ criteria, publisher, ip }) {
  return !(_.isUndefined((criteria || {}).tier) ||
      _.isUndefined(publisher) || _.isUndefined(ip))
}
