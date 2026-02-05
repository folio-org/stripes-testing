require('dotenv/config');

const configs = {
  rp: {
    endpoint: process.env.RP_API_URL,
    project: process.env.RP_CYPRESS_PROJECT_NAME,
    apiKey: process.env.CI_API_KEY, // Should match the one used in cypress.config.js
  },
};

module.exports = { configs };
