module.exports.namegen = function() {
  var ts = new Date().valueOf()
  var fn = ['Emma','Olivia','Ava','Sophia','Isabella','Liam','Noah','Mason','Lucas','Oliver']
  var ln = ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriquez','Wilson']
  var fnpos = Math.floor(Math.random() * fn.length)
  var lnpos = Math.floor(Math.random() * ln.length)
  var firstname = fn[fnpos]
  var lastname = ln[lnpos]
  return {
    id: firstname.substr(0,1).toLowerCase() + lastname.toLowerCase() + ts,
    firstname: firstname,
    lastname: lastname,
    email: firstname.toLowerCase() + '.' + lastname.toLowerCase() + '@someserver.org',
    barcode: ts,
    password: 'P@$$w0rd23'
  }
}
