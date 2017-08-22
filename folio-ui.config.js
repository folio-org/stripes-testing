//
// global debug options for tests
//
module.exports = {
    url:  process.env.FOLIO_UI_URL || 'http://folio-testing.aws.indexdata.com',
    username: process.env.FOLIO_UI_USERNAME || 'diku_admin',
    password: process.env.FOLIO_UI_PASSWORD || 'admin',
    debug_sleep: process.env.FOLIO_UI_DEBUG_SLEEP || 4000,
    login_wait: process.env.FOLIO_UI_LOGIN_WAIT || 1000,
    select: {
      username: 'input[name=username]',
      password: 'input[name=password]',
      submit: 'button[type=submit]',
      login: '#clickable-login',
      logout: '#clickable-logout',
      settings: 'a[href="/settings"]'
    },

    nightmare: process.env.FOLIO_UI_DEBUG == 2 ? {
        typeInterval: 75,
        openDevTools: {
            mode: 'detach'
        },
        width: 800,
        height: 600,
        show: true
    } : process.env.FOLIO_UI_DEBUG == 1 ? {
        width: 1600,
        height: 1200,
        typeInterval: 75,
        show: true
    } : { typeInterval: 75 }
}
