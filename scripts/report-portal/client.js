const axios = require('axios');
const { configs } = require('./configs.js');

const rpClient = axios.create({
  baseURL: 'https://report-portal.ci.folio.org/api/v1/cypress-nightly/',
  headers: {
    Authorization: `bearer ${configs.rp.apiKey}`,
  },
});

module.exports = { rpClient };
