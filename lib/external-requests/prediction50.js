// var request = require('request')
// var timeout = require('../../config').timeout

module.exports = testPrediction50

// function prediction50 ({ reqInfo, geo }, cb) {
//   var url = `http://predictionengine.lincx.la/predict?reqId=${reqInfo.requestId}`
//   var data = translateFields(reqInfo, geo)
//
//   if (!haveRequiredFields(data)) return cb(null, { geoStats: geo, prediction50: 'data-missing' })
//
//   var options = {
//     method: 'post',
//     url,
//     body: [data],
//     json: true,
//     pool: { maxSockets: Infinity },
//     timeout: parseInt(timeout),
//     headers: {
//       'Content-Type': 'application/json'
//     }
//   }
//
//   var t0 = Date.now()
//   request.post(options, function (err, r, body) {
//     console.log({
//       externalAPI: 'prediction50',
//       responseTime: Date.now() - t0
//     })
//
//     if (err) {
//       err.message = 'prediction50: ' + err.message || err.code
//       console.warn(err)
//       return cb(null, { geoStats: geo, prediction50: 'error' })
//     }
//
//     var response = (((body || {}).prediction || [])[0] === 1) ? 'above' : 'below'
//     cb(null, { geoStats: geo, prediction50: response })
//   })
// }

// function haveRequiredFields (data) {
//   var requiredFields = [
//     'sold_at',
//     'monthly_income',
//     'income_type',
//     'state',
//     'zip_code',
//     'account_type',
//     'requested_amount',
//     'months_at_address',
//     'residency_status',
//     'months_at_employer',
//     'direct_deposit',
//     'dow'
//   ]
//
//   return !requiredFields.find(field => !Object.keys(data).includes(field))
// }

// function translateFields (object, geo) {
//   var days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
//   var translated = {}
//
//   translated.dow = days[new Date().getDay()]
//   translated.sold_at = new Date().toISOString()
//   if (object.income) translated.monthly_income = object.income
//   if (object.employmentStatus) translated.income_type = object.employmentStatus
//   if (object.bankAccount) translated.account_type = object.bankAccount
//   if (object.requestedLoanAmount) translated.requested_amount = object.requestedLoanAmount
//   if (object.timeResidence) translated.months_at_address = object.timeResidence
//   if (object.homeOwner) translated.residency_status = object.homeOwner
//   if (object.timeJob) translated.months_at_employer = object.timeJob
//   if (geo.postal) translated.zip_code = geo.postal
//   if (object.payType) translated.direct_deposit = (object.payType === 'directDeposit').toString().toUpperCase()
//
//   var data = Object.assign({}, object, geo, translated)
//   return data
// }

function testPrediction50 ({ reqInfo, geo }, cb) {
  var test = { geoStats: geo, prediction50: 'above' }
  cb(null, test)
}
