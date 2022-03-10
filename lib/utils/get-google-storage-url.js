
var { bucketName } = require('../../config')

module.exports = function (filename) {
  return `https://storage.googleapis.com/${bucketName}/${filename}`
}
