const axios = require('axios');

/**
 * HTTP-related Cypress tasks that run in Node.js context
 * These tasks execute outside the browser to avoid cookie pollution
 */
module.exports = {
  /**
   * Makes HTTP GET request via axios in Node.js context (no browser cookies)
   * Use this when you need to simulate external client behavior
   *
   * Common use cases:
   * - Edge API requests without browser session pollution
   * - External API integrations
   * - Any scenario requiring cookie-free HTTP requests
   *
   * @param {Object} options - Request options
   * @param {string} options.url - Full URL for the request
   * @param {Object} options.params - Query string parameters
   * @param {Object} options.headers - Optional HTTP headers
   * @returns {Promise<string>} Response data
   */
  async axiosRequest({ url, params, headers = {} }) {
    try {
      const response = await axios.get(url, { params, headers });
      return response.data;
    } catch (error) {
      // Return error details for better debugging
      throw new Error(
        `Axios request failed: ${error.message}\nURL: ${url}\nStatus: ${error.response?.status}`,
      );
    }
  },
};
