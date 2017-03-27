//
// global debug options for tests
//
module.exports = {
    url:  process.env.FOLIO_UI_URL || 'http://localhost:3000',
    username: process.env.FOLIO_UI_USERNAME || 'diku_admin',
    password: process.env.FOLIO_UI_PASSWORD || 'admin',
    debug_sleep: process.env.FOLIO_UI_DEBUG_SLEEP || 6000,
    
    nightmare: process.env.FOLIO_UI_DEBUG == 2 ? {
        openDevTools: {
            mode: 'detach'
        },
        width: 1200,
        height: 600,
        show: true
    } : process.env.FOLIO_UI_DEBUG == 1 ? {
        show: true
    } : {}
}
