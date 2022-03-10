module.exports = function isSubstring (value, valueToCompare) {
  if (value === valueToCompare) return true
  var placeToMatch = findPlaceToMatch(value)
  var targetValue = value.replace(/\*/g, '')

  if (!placeToMatch || !valueToCompare) return false
  if (placeToMatch === 'start') return valueToCompare.startsWith(targetValue)
  if (placeToMatch === 'end') return valueToCompare.endsWith(targetValue)
  if (placeToMatch === 'inside') {
    var trimedValue = valueToCompare.slice(1, valueToCompare.length - 1)
    return trimedValue.includes(targetValue)
  }
}

function findPlaceToMatch (value) {
  if (value[0] === '*' && value[value.length - 1] === '*') {
    return 'inside'
  }
  if (value[0] === '*') return 'end'
  if (value[value.length - 1] === '*') return 'start'
  return null
}
