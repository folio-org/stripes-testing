module.exports.login = (nightmare, config, done, un, pw) => {
    nightmare
    .on('page', function(type="alert", message) {
       throw new Error(message)
     })
    .goto(config.url)
    .wait(Number(config.login_wait))
    .insert(config.select.username, (un || config.username))
    .insert(config.select.password, (pw || config.password))
    .click(config.select.login)
    .wait(config.select.logout)
    .then(result => done())
};

module.exports.logout = (nightmare, config, done) => {
  nightmare
  .click(config.select.logout) // logout
  .wait('div[class^="loginContainer"') // login page
  .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep/3) : 0) // debugging
  .then(result => {done()})
}
