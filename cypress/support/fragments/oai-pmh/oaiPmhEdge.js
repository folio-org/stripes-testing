/**
 * OAI-PMH Edge URL Request Methods
 * These methods send OAI-PMH requests via Edge URL with apiKey authentication
 * Used for single-tenant harvesting in both regular and consortia environments
 *
 * Uses cy.task('axiosRequest') to run axios in Node.js context (cypress.config.js)
 * This avoids browser cookie pollution and simulates true external Edge API client behavior
 */

import Affiliations from '../../dictionary/affiliations';
import DateTools from '../../utils/dateTools';

function validateEdgeHost() {
  const edgeHost = Cypress.env('EDGE_HOST');
  if (!edgeHost) {
    throw new Error('EDGE_HOST is not configured');
  }

  return edgeHost;
}

function validateApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('API key is required for Edge OAI-PMH requests');
  }
}

function makeEdgeRequest(params) {
  const edgeHost = validateEdgeHost();

  return cy.task('axiosRequest', {
    url: `${edgeHost}/oai/records`,
    params,
  });
}

function addDateParams(params, fromDate, untilDate) {
  params.from = fromDate || DateTools.getCurrentDateForOaiPmh(-2);
  params.until = untilDate || DateTools.getCurrentDateForOaiPmh(2);
}

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
   * Get Edge API key for a specific tenant affiliation
   * @param {string} affiliation - Tenant affiliation from Affiliations object (e.g., Affiliations.College, Affiliations.University, Affiliations.Consortia)
   * @returns {string} API key for the tenant
   * @throws {Error} If API key is not configured for the tenant or affiliation is unknown
   */
  getApiKey(affiliation) {
    let apiKeyVar;

    // Compare against actual Affiliations constants - works in any environment
    if (affiliation === Affiliations.Consortia) {
      apiKeyVar = 'EDGE_CENTRAL_API_KEY';
    } else if (affiliation === Affiliations.College) {
      apiKeyVar = 'EDGE_COLLEGE_API_KEY';
    } else if (affiliation === Affiliations.University) {
      apiKeyVar = 'EDGE_UNIVERSITY_API_KEY';
    } else {
      throw new Error(`Unknown affiliation '${affiliation}'. Valid affiliations: `);
    }

    const apiKey = Cypress.env(apiKeyVar);

    if (!apiKey) {
      throw new Error(
        `${apiKeyVar} is not configured. ` +
          'Please set it in environments.js or Jenkins environment variables',
      );
    }

    return apiKey;
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
    validateEdgeHost();
    validateApiKey(apiKey);

    // Get base URL from OAI-PMH configuration
    return cy.getOaiPmhConfigurations('general').then((body) => {
      const configValue = body?.configurationSettings[0]?.configValue;

      if (!configValue?.baseUrl) {
        throw new Error('OAI-PMH base URL not configured in Settings > OAI-PMH > General');
      }

      const fullBaseUrl = configValue.baseUrl;
      const baseUrl = fullBaseUrl.replace(/^https?:\/\//, '').replace(/\/oai.*$/, '');
      const identifier = `oai:${baseUrl}:${tenantId}/${instanceUuid}`;

      return makeEdgeRequest({
        verb: 'GetRecord',
        metadataPrefix,
        identifier,
        apikey: apiKey,
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
    validateApiKey(apiKey);

    return cy.then(() => {
      const params = {
        verb: 'ListRecords',
        metadataPrefix,
        apikey: apiKey,
      };

      addDateParams(params, fromDate, untilDate);

      return makeEdgeRequest(params);
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
    validateApiKey(apiKey);

    return cy.then(() => {
      const params = {
        verb: 'ListIdentifiers',
        metadataPrefix,
        apikey: apiKey,
      };

      addDateParams(params, fromDate, untilDate);

      return makeEdgeRequest(params);
    });
  },

  /**
   * Send OAI-PMH ListRecords request with resumptionToken via Edge URL
   * Used for paginated harvesting in consortia environments where records from multiple tenants
   * are returned in separate responses, each with a resumptionToken to fetch the next page
   * @param {string} resumptionToken - Resumption token from previous OAI-PMH response
   * @param {string} apiKey - API key for the specific tenant
   * @returns {Cypress.Chainable<string>} Response body (XML string)
   */
  listRecordsRequestWithResumptionToken(resumptionToken, apiKey) {
    validateApiKey(apiKey);

    if (!resumptionToken) {
      throw new Error('resumptionToken is required for paginated OAI-PMH requests');
    }

    return makeEdgeRequest({
      verb: 'ListRecords',
      resumptionToken,
      apikey: apiKey,
    });
  },

  /**
   * Send OAI-PMH ListIdentifiers request with resumptionToken via Edge URL
   * @param {string} resumptionToken - Resumption token from previous OAI-PMH response
   * @param {string} apiKey - API key for the specific tenant
   * @returns {Cypress.Chainable<string>} Response body (XML string)
   */
  listIdentifiersRequestWithResumptionToken(resumptionToken, apiKey) {
    validateApiKey(apiKey);

    if (!resumptionToken) {
      throw new Error('resumptionToken is required for paginated OAI-PMH requests');
    }

    return makeEdgeRequest({
      verb: 'ListIdentifiers',
      resumptionToken,
      apikey: apiKey,
    });
  },
};
