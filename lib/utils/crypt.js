const crypto = require('crypto')

module.exports = {
  encrypt,
  decrypt
}

function encrypt (value, encryptionKey, algorithm = 'aes256') {
  const cipher = crypto.createCipher(algorithm, encryptionKey) // eslint-disable-line
  return cipher.update(value, 'utf8', 'hex') + cipher.final('hex')
}

function decrypt (value, encryptionKey, algorithm = 'aes256') {
  const decipher = crypto.createDecipher(algorithm, encryptionKey) // eslint-disable-line
  return decipher.update(value, 'hex', 'utf8') + decipher.final('utf8')
}
