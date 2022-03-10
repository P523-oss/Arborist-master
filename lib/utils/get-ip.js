var clientIp = require('client-ip')

module.exports = function (req) {
  req.connection.socket = req.connection.socket || {}

  var ips = (clientIp(req) || '')
    .replace('::ffff:', '')
    .replace(/\s/g, '')
    .split(',')

  var ip = ips.length > 1 ? ips[ips.length - 2] : ips[0]
  if (ip === '::1') ip = '96.55.108.180'

  return ip
}
