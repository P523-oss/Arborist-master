var validator = require('validator')

const formatEmail = require('./format-email')

module.exports = {
  formatOwnerAccessListEmail,
  validateOwnerAccessList
}
function formatOwnerAccessListEmail (entity) {
  if (!entity) return
  const formattedEntity = {}
  if ((entity || {}).owner) {
    formattedEntity.owner = formatEmail((entity || {}).owner)
  }
  if ((entity || {}).accessList) {
    formattedEntity.accessList = (entity || {}).accessList.map(email => formatEmail(email))
  }
  return Object.assign({}, entity, formattedEntity)
}

function validateOwnerAccessList (advertiser) {
  if (advertiser.owner && !validator.isEmail(advertiser.owner)) {
    return {
      message: 'Bad Request - invalid owner email',
      statusCode: 400
    }
  }
  if (!advertiser.accessList) return
  for (let i = 0; i < advertiser.accessList.length; i++) {
    const email = advertiser.accessList[i]
    if (!validator.isEmail(email)) {
      return {
        message: 'Bad Request - invalid access list invalid email:' + email,
        statusCode: 400
      }
    }
    if (advertiser.accessList.indexOf(email) !== i) {
      return {
        message: 'Bad Request - invalid access list duplicated email:' + email,
        statusCode: 400
      }
    }
    if (email === advertiser.owner) {
      return {
        message: 'Bad Request - invalid access list email duplicated with owner:' + email,
        statusCode: 400
      }
    }
  }
}
