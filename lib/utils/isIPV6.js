var isIp = require('is-ip')

module.exports = function (ip) {
  if (!isIp(ip)) return

  return isIp.v6(ip)
}
