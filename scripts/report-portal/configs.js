require('dotenv/config');

const configs = {
  rp: {
    apiKey: process.env.CI_API_KEY, // Should match the one used in cypress.config.js
  },
};

module.exports = { configs };
