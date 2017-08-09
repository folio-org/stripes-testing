module.exports.namegen = function() {
  var ts = new Date().valueOf()
  var fn = ['Emma','Olivia','Ava','Sophia','Isabella','Liam','Noah','Mason','Lucas','Oliver']
  var ln = ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriquez','Wilson']
  var ad = [{city: 'Chicago',zip: '60609',address: '5 Wacker Dr', country: 'USA',state: 'IL', phone:'13125552121'},
            {city: 'New York',zip: '10002-2341',address: '425 Bowery', country: 'USA',state: 'NY', phone:'12125554444'},
            {city: 'San Francisco',zip: '94016',address: '39 Green Street', country: 'USA',state: 'CA', phone:'12153338888'},
            {city: 'København',zip: '1208',address: 'Nybrogade 30', country: 'Denmark',state: 'K', phone:'453332229999'}]
  var fnpos = Math.floor(Math.random() * fn.length)
  var lnpos = Math.floor(Math.random() * ln.length)
  var adpos = Math.floor(Math.random() * ad.length)
  var firstname = fn[fnpos]
  var lastname = ln[lnpos]
  return {
    id: firstname.substr(0,1).toLowerCase() + lastname.toLowerCase() + ts,
    firstname: firstname,
    lastname: lastname,
    email: firstname.toLowerCase() + '.' + lastname.toLowerCase() + '@someserver.org',
    barcode: ts,
    password: 'P@$$w0rd23',
    address: ad[adpos]
  }
}
