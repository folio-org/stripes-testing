//
// global debug options for tests
//
module.exports = {
    url:  process.env.FOLIO_UI_URL || 'http://localhost:3000',
    username: process.env.FOLIO_UI_USERNAME || 'diku_admin',
    password: process.env.FOLIO_UI_PASSWORD || 'admin',
    debug_sleep: process.env.FOLIO_UI_DEBUG_SLEEP || 4000,
    select: {
      username: 'input[name=username]',
      password: 'input[name=password]',
      submit: 'button[type=submit]',
      logout: '#button-logout',
      settings: 'a[href="/settings"]'
    },

    nightmare: process.env.FOLIO_UI_DEBUG == 2 ? {
        typeInterval: 50,
        openDevTools: {
            mode: 'detach'
        },
        width: 800,
        height: 600,
        show: true
    } : process.env.FOLIO_UI_DEBUG == 1 ? {
        width: 1000,
        height: 700,
        typeInterval: 50,
        show: true
    } : { typeInterval: 5 }
}
