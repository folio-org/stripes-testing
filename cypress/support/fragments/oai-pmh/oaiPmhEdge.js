/**
 * OAI-PMH Edge URL Request Methods
 * These methods send OAI-PMH requests via Edge URL with apiKey authentication
 * Used for single-tenant harvesting in both regular and consortia environments
 *
 * Uses cy.task('axiosRequest') to run axios in Node.js context (cypress.config.js)
 * This avoids browser cookie pollution and simulates true external Edge API client behavior
 */

import DateTools from '../../utils/dateTools';

export default {
  /**
   * Validates that Edge configuration is available for OAI-PMH tests
   * @returns {boolean} True if Edge is configured
   * @throws {Error} If Edge configuration is missing
   */
  validateEdgeConfiguration() {
    const edgeHost = Cypress.env('EDGE_HOST');

    if (!edgeHost) {
      throw new Error(
        'EDGE_HOST is not configured. Please set it in environments.js or Jenkins environment variables. ' +
          'This is required for OAI-PMH Edge tests.',
      );
    }

    return true;
  },

  /**
   * Checks if Edge configuration is available (non-throwing version)
   * Use this for conditional test execution
   * @returns {boolean} True if Edge is configured
   */
  isEdgeConfigured() {
    const edgeHost = Cypress.env('EDGE_HOST');
    return !!edgeHost;
  },

  /**
   * Send OAI-PMH GetRecord request via Edge URL
   * @param {string} instanceUuid - Instance UUID
   * @param {string} tenantId - Tenant ID (e.g., 'diku', 'consortium', 'college', 'university')
   * @param {string} metadataPrefix - Metadata format (marc21, oai_dc, marc21_withholdings)
   * @param {string} apiKey - API key for the specific tenant
   * @returns {Cypress.Chainable<string>} Response body (XML string)
   */
  getRecordRequest(instanceUuid, tenantId, metadataPrefix = 'marc21', apiKey) {
    const edgeHost = Cypress.env('EDGE_HOST');

    if (!edgeHost) {
      throw new Error(
        'EDGE_HOST is not configured. Please set it in environments.js or Jenkins environment variables.',
      );
    }

    if (!apiKey) {
      throw new Error('API key is required for Edge OAI-PMH requests');
    }

    // Get base URL from OAI-PMH configuration
    return cy.getOaiPmhConfigurations('general').then((body) => {
      const configValue = body?.configurationSettings[0]?.configValue;

      if (!configValue?.baseUrl) {
        throw new Error('OAI-PMH base URL not configured in Settings > OAI-PMH > General');
      }

      const fullBaseUrl = configValue.baseUrl;
      const baseUrl = fullBaseUrl.replace(/^https?:\/\//, '').replace(/\/oai.*$/, '');

      const identifier = `oai:${baseUrl}:${tenantId}/${instanceUuid}`;

      // Use cy.task to run axios in Node.js context - no browser cookies
      return cy.task('axiosRequest', {
        url: `${edgeHost}/oai/records`,
        params: {
          verb: 'GetRecord',
          metadataPrefix,
          identifier,
          apikey: apiKey,
        },
      });
    });
  },

  /**
   * Send OAI-PMH ListRecords request via Edge URL
   * @param {string} metadataPrefix - Metadata format (default: 'marc21')
   * @param {string} apiKey - API key for the specific tenant (determines which tenant to query)
   * @param {string} fromDate - From date in ISO 8601 format (optional)
   * @param {string} untilDate - Until date in ISO 8601 format (optional)
   * @returns {Cypress.Chainable<string>} Response body (XML string)
   */
  listRecordsRequest(metadataPrefix = 'marc21', apiKey, fromDate = null, untilDate = null) {
    const edgeHost = Cypress.env('EDGE_HOST');

    if (!edgeHost) {
      throw new Error('EDGE_HOST is not configured');
    }

    if (!apiKey) {
      throw new Error('API key is required for Edge OAI-PMH requests');
    }

    const params = {
      verb: 'ListRecords',
      metadataPrefix,
      apikey: apiKey,
    };

    if (fromDate) {
      params.from = fromDate;
    } else {
      params.from = DateTools.getCurrentDateForOaiPmh(-2); // Current time minus 2 minutes
    }

    if (untilDate) {
      params.until = untilDate;
    } else {
      params.until = DateTools.getCurrentDateForOaiPmh(2); // Current time plus 2 minutes
    }

    // Use cy.task to run axios in Node.js context - no browser cookies
    return cy.task('axiosRequest', {
      url: `${edgeHost}/oai/records`,
      params,
    });
  },

  /**
   * Send OAI-PMH ListIdentifiers request via Edge URL
   * @param {string} metadataPrefix - Metadata format (default: 'marc21')
   * @param {string} apiKey - API key for the specific tenant (determines which tenant to query)
   * @param {string} fromDate - From date in ISO 8601 format (optional)
   * @param {string} untilDate - Until date in ISO 8601 format (optional)
   * @returns {Cypress.Chainable<string>} Response body (XML string)
   */
  listIdentifiersRequest(metadataPrefix = 'marc21', apiKey, fromDate = null, untilDate = null) {
    const edgeHost = Cypress.env('EDGE_HOST');

    if (!edgeHost) {
      throw new Error('EDGE_HOST is not configured');
    }

    if (!apiKey) {
      throw new Error('API key is required for Edge OAI-PMH requests');
    }

    const params = {
      verb: 'ListIdentifiers',
      metadataPrefix,
      apikey: apiKey,
    };

    if (fromDate) {
      params.from = fromDate;
    } else {
      params.from = DateTools.getCurrentDateForOaiPmh(-2); // Current time minus 2 minutes
    }

    if (untilDate) {
      params.until = untilDate;
    } else {
      params.until = DateTools.getCurrentDateForOaiPmh(2); // Current time plus 2 minutes
    }

    // Use cy.task to run axios in Node.js context - no browser cookies
    return cy.task('axiosRequest', {
      url: `${edgeHost}/oai/records`,
      params,
    });
  },
};
