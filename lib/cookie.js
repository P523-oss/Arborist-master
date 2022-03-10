const Cookies = require('cookies')
const cookieCfg = require('../config').cookie
const crypt = require('./utils/crypt')

const MAX_COOKIE_VALUE_SIZE = 1.5 * 1000 // 3K Bytes
module.exports = {
  write,
  read
}

function write (req, res, key, value) {
  const expirationDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
  const { signingKey, secure } = cookieCfg
  const cookies = new Cookies(req, res, { keys: signingKey, secure: secure })
  let encryptedValue = crypt.encrypt(value, cookieCfg.encryptionKey)
  if (!isValidCookieValueSize(encryptedValue)) {
    const newValue = handleInvalidCookieValue(value)
    encryptedValue = crypt.encrypt(newValue, cookieCfg.encryptionKey)
  }
  cookies.set(key, encryptedValue, {
    expires: expirationDate,
    signed: cookieCfg.secure,
    secure: cookieCfg.secure,
    domain: cookieCfg.domain
  })
}

function read (req, res, key) {
  const { signingKey, secure } = cookieCfg

  const cookies = new Cookies(req, res, { keys: signingKey, secure: secure })
  const value = cookies.get(key)
  if (!value) return
  try {
    return crypt.decrypt(value, cookieCfg.encryptionKey)
  } catch (e) {
    return void 0 // eslint-disable-line
  }
}

function isValidCookieValueSize (value) {
  return value.length <= MAX_COOKIE_VALUE_SIZE
}

function handleInvalidCookieValue (value) {
  const parsedValue = JSON.parse(value)
  const keys = Object.keys(parsedValue)
  const lastKey = keys[keys.length - 1]
  const newValue = {
    [lastKey]: parsedValue[lastKey]
  }
  return JSON.stringify(newValue)
}
