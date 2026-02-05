const axios = require('axios');
const { configs } = require('./configs.js');

const rpClient = axios.create({
  baseURL: `${configs.rp.endpoint}/${configs.rp.project}/`,
  headers: {
    Authorization: `bearer ${configs.rp.apiKey}`,
  },
});

module.exports = { rpClient };
