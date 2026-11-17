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

  /**
   * Sets the expiration of the create/reset password links (mod-users-bl configuration, it is
   * a tenant-wide setting) in Node.js context. Logs in as the admin with a session of its own
   * (the cookies are kept in a variable), so the result doesn't depend on the browser session:
   * the app of a logged in user can still change the browser cookies when a test is finished.
   * Creates the configuration entries or edits the existing ones.
   *
   * @param {Object} options
   * @param {string} options.okapiHost - host of the API gateway
   * @param {string} options.tenant - tenant ID
   * @param {string} options.username - admin username
   * @param {string} options.password - admin password
   * @param {string} options.unitOfTime - e.g. 'minutes', 'hours'
   * @param {number|string} options.time - amount of the units
   * @returns {Promise<null>}
   */
  async setPasswordResetLinkExpiration({
    okapiHost,
    tenant,
    username,
    password,
    unitOfTime,
    time,
  }) {
    const newValues = {
      RESET_PASSWORD_LINK_EXPIRATION_UNIT_OF_TIME: unitOfTime,
      RESET_PASSWORD_LINK_EXPIRATION_TIME: String(time),
    };
    const headers = { 'x-okapi-tenant': tenant, 'content-type': 'application/json' };

    try {
      const login = await axios.post(
        `${okapiHost}/authn/login`,
        { username, password },
        { headers },
      );
      const cookie = login.headers['set-cookie'].map((item) => item.split(';')[0]).join('; ');
      const sessionHeaders = { ...headers, cookie };
      const { data } = await axios.get(`${okapiHost}/configurations/entries`, {
        headers: sessionHeaders,
        params: { query: '(module==USERSBL and configName==resetPassword)', limit: 100 },
      });

      await Promise.all(
        Object.entries(newValues).map(([code, value]) => {
          const existing = data.configs.find((config) => config.code === code);

          if (existing) {
            return axios.put(
              `${okapiHost}/configurations/entries/${existing.id}`,
              { ...existing, value },
              { headers: sessionHeaders },
            );
          }
          return axios.post(
            `${okapiHost}/configurations/entries`,
            {
              module: 'USERSBL',
              configName: 'resetPassword',
              code,
              default: true,
              enabled: true,
              value,
            },
            { headers: sessionHeaders },
          );
        }),
      );

      return null;
    } catch (error) {
      throw new Error(
        `Setting of the password reset link expiration failed: ${error.message}\nStatus: ${error.response?.status}`,
      );
    }
  },
};
