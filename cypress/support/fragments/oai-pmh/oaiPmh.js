/* eslint-disable no-unused-expressions */
import DateTools from '../../utils/dateTools';

export default {
  /**
   * Private helper method to parse XML string into DOM document
   * @param {string} xmlString - The XML response as a string
   * @returns {Document} Parsed XML document
   * @private
   */
  _parseXmlString(xmlString) {
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, 'application/xml');
  },

  getBaseUrl() {
    const cachedBaseUrl = Cypress.env('OAI_PMH_BASE_URL');

    if (cachedBaseUrl) {
      return cy.wrap(cachedBaseUrl);
    }

    return cy.getConfigByName('OAIPMH', 'general').then(({ configs }) => {
      // Extract baseUrl from the configuration string
      const configValue = JSON.parse(configs[0].value);
      const fullBaseUrl = configValue.baseUrl;
      const baseUrl = fullBaseUrl.replace(/^https?:\/\//, '').replace(/\/oai.*$/, '');

      Cypress.env('OAI_PMH_BASE_URL', baseUrl);
      return baseUrl;
    });
  },

  /**
   * Sends a GET request to the OAI-PMH GetRecord endpoint
   * @param {string} instanceUuid - The instance UUID to retrieve
   * @param {string} metadataPrefix - The metadata format (default: 'marc21')
   * @returns {Cypress.Chainable} The response body from the OAI-PMH request
   */
  getRecordRequest(instanceUuid, metadataPrefix = 'marc21') {
    return this.getBaseUrl().then((baseUrl) => {
      const identifier = `oai:${baseUrl}:${Cypress.env('OKAPI_TENANT')}/${instanceUuid}`;

      return cy
        .okapiRequest({
          method: 'GET',
          path: 'oai/records',
          searchParams: {
            verb: 'GetRecord',
            metadataPrefix,
            identifier,
          },
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: true,
        })
        .then((response) => {
          return response.body;
        });
    });
  },

  /**
   * Verifies the OAI-PMH record header including identifier and status for a specific record identified by instanceUuid.
   * Works consistently for both single-record (GetRecord) and multi-record (ListRecords) responses.
   * @param {string} xmlString - The XML response as a string.
   * @param {string} instanceUuid - The instance UUID to target a specific record (mandatory).
   * @param {boolean} shouldBeDeleted - Whether the instance should have deleted status (default: false).
   * @param {boolean} verifyIdentifier - Whether to verify the identifier format (default: true).
   */
  verifyOaiPmhRecordHeader(
    xmlString,
    instanceUuid,
    shouldBeDeleted = false,
    verifyIdentifier = true,
  ) {
    const expectedStatus = shouldBeDeleted ? 'deleted' : null;
    const xmlDoc = this._parseXmlString(xmlString);

    let targetHeader;

    // Always search for the record by instanceUuid - works for both single and multi-record responses
    const records = xmlDoc.getElementsByTagName('record');

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const header = record.getElementsByTagName('header')[0];

      if (header) {
        const identifierElement = header.getElementsByTagName('identifier')[0];

        if (identifierElement) {
          const identifier = identifierElement.textContent;

          if (identifier.includes(instanceUuid)) {
            targetHeader = header;
            break;
          }
        }
      }
    }

    if (!targetHeader) {
      throw new Error(`Record header with UUID ${instanceUuid} not found in the response`);
    }

    // Verify status attribute
    const status = targetHeader.getAttribute('status');
    if (expectedStatus === null) {
      expect(
        status,
        `Header status should be absent (null) for active record with UUID ${instanceUuid}`,
      ).to.be.null;
    } else {
      expect(
        status,
        `Header status should be "${expectedStatus}" for record with UUID ${instanceUuid}`,
      ).to.equal(expectedStatus);
    }

    // Verify identifier
    if (verifyIdentifier) {
      const identifierElement = targetHeader.getElementsByTagName('identifier')[0];
      const identifier = identifierElement.textContent;

      this.getBaseUrl().then((baseUrl) => {
        const expectedIdentifier = `oai:${baseUrl}:${Cypress.env('OKAPI_TENANT')}/${instanceUuid}`;
        expect(
          identifier,
          `Identifier should match expected OAI format for record with UUID ${instanceUuid}`,
        ).to.equal(expectedIdentifier);
      });
    }
  },

  /**
   * Verify MARC field and subfield values in a specific record identified by instanceUuid.
   * Works consistently for both single-record (GetRecord) and multi-record (ListRecords) responses.
   * @param {string} xmlString - The XML response as a string.
   * @param {string} instanceUuid - The instance UUID to target a specific record (mandatory).
   * @param {string} tag - The tag of the MARC field to verify (e.g., "999").
   * @param {Object} indicators - Object containing the indicators (e.g., { ind1: "f", ind2: "f" }).
   * @param {Object} subfields - Object where keys are subfield codes and values are expected values (e.g., { t: "0", i: "12345" }).
   * @param {Array} absentSubfields - Array of subfield codes that should NOT exist (e.g., ["x", "y"]).
   */
  verifyMarcField(
    xmlString,
    instanceUuid,
    tag,
    indicators = {},
    subfields = {},
    absentSubfields = [],
  ) {
    const xmlDoc = this._parseXmlString(xmlString);

    // Use the namespace URI for MARC21
    const namespaceURI = 'http://www.loc.gov/MARC21/slim';

    let targetRecordElement;

    // Always search for the record by instanceUuid - works for both single and multi-record responses
    const records = xmlDoc.getElementsByTagName('record');

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const header = record.getElementsByTagName('header')[0];

      if (header) {
        const identifierElement = header.getElementsByTagName('identifier')[0];

        if (identifierElement) {
          const identifier = identifierElement.textContent;

          if (identifier.includes(instanceUuid)) {
            const metadata = record.getElementsByTagName('metadata')[0];
            if (metadata) {
              targetRecordElement = metadata.getElementsByTagNameNS(namespaceURI, 'record')[0];
            }
            break;
          }
        }
      }
    }

    if (!targetRecordElement) {
      throw new Error(`Record with UUID ${instanceUuid} not found in the response`);
    }

    // Find all `datafield` elements within the target record
    const datafields = targetRecordElement.getElementsByTagNameNS(namespaceURI, 'datafield');
    const field = Array.from(datafields).find((datafield) => {
      const matchesTag = datafield.getAttribute('tag') === tag;
      const matchesInd1 = !indicators.ind1 || datafield.getAttribute('ind1') === indicators.ind1;
      const matchesInd2 = !indicators.ind2 || datafield.getAttribute('ind2') === indicators.ind2;

      return matchesTag && matchesInd1 && matchesInd2;
    });

    if (!field) {
      throw new Error(`MARC field ${tag} not found in record with UUID ${instanceUuid}`);
    }

    const subfieldsAll = field.getElementsByTagNameNS(namespaceURI, 'subfield');

    Object.entries(subfields).forEach(([subfieldCode, expectedValue]) => {
      const subfield = Array.from(subfieldsAll).filter(
        (sf) => sf.getAttribute('code') === subfieldCode,
      );

      if (!subfield) {
        throw new Error(
          `Subfield "${subfieldCode}" not found in ${tag} field of record with UUID ${instanceUuid}`,
        );
      }
      if (subfield.length > 1) {
        throw new Error(
          `Multiple subfields "${subfieldCode}" found in ${tag} field of record with UUID ${instanceUuid}`,
        );
      }

      // Assert that the subfield has the expected value
      expect(
        subfield[0].textContent,
        `Subfield "${subfieldCode}" of ${tag} field should have value "${expectedValue}" in record with UUID ${instanceUuid}`,
      ).to.equal(expectedValue);
    });

    // Verify absent subfields
    absentSubfields.forEach((subfieldCode) => {
      const subfield = Array.from(subfieldsAll).find(
        (sf) => sf.getAttribute('code') === subfieldCode,
      );

      expect(
        subfield,
        `Subfield "${subfieldCode}" should NOT exist in ${tag} field of record with UUID ${instanceUuid}`,
      ).to.be.undefined;
    });
  },

  /**
   * Verify Dublin Core field values in OAI-PMH oai_dc response.
   * @param {string} xmlString - The XML response as a string.
   * @param {Object} fields - Object where keys are Dublin Core element names and values are expected values (e.g., { title: "Sample Title", type: "Text", language: "eng" }).
   */
  verifyDublinCoreField(xmlString, fields = {}) {
    const xmlDoc = this._parseXmlString(xmlString);

    // Use the namespace URI for Dublin Core
    const dcNamespaceURI = 'http://purl.org/dc/elements/1.1/';

    Object.entries(fields).forEach(([elementName, expectedValue]) => {
      // Find all Dublin Core elements with the specified name
      const dcElements = xmlDoc.getElementsByTagNameNS(dcNamespaceURI, elementName);

      if (dcElements.length === 0) {
        throw new Error(`Dublin Core element "${elementName}" not found in the response`);
      }

      const element = dcElements[0];

      expect(
        element.textContent,
        `Dublin Core element "${elementName}" should have value "${expectedValue}"`,
      ).to.equal(expectedValue);
    });
  },

  /**
   * Sends a GET request to the OAI-PMH ListRecords endpoint
   * @param {string} metadataPrefix - The metadata format (default: 'marc21')
   * @param {string} fromDate - Optional from date in YYYY-MM-DDTHH:mm:ssZ format
   * @param {string} untilDate - Optional until date in YYYY-MM-DDTHH:mm:ssZ format
   * @returns {Cypress.Chainable} The response body from the OAI-PMH request
   */
  listRecordsRequest(metadataPrefix = 'marc21', fromDate = null, untilDate = null) {
    const searchParams = {
      verb: 'ListRecords',
      metadataPrefix,
    };

    if (fromDate) {
      searchParams.from = fromDate;
    } else {
      searchParams.from = DateTools.getCurrentDateForOaiPmh(-2); // Current time minus 2 minutes
    }

    if (untilDate) {
      searchParams.until = untilDate;
    } else {
      searchParams.until = DateTools.getCurrentDateForOaiPmh(2); // Current time plus 2 minutes
    }

    return cy
      .okapiRequest({
        method: 'GET',
        path: 'oai/records',
        searchParams,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: true,
      })
      .then((response) => {
        return response.body;
      });
  },

  /**
   * Sends a GET request to the OAI-PMH ListIdentifiers endpoint
   * @param {string} metadataPrefix - The metadata format (default: 'marc21')
   * @param {string} fromDate - Optional from date in YYYY-MM-DDTHH:mm:ssZ format
   * @param {string} untilDate - Optional until date in YYYY-MM-DDTHH:mm:ssZ format
   * @returns {Cypress.Chainable} The response body from the OAI-PMH request
   */
  listIdentifiersRequest(metadataPrefix = 'marc21', fromDate = null, untilDate = null) {
    const currentTime = new Date();
    const fromTime = new Date(currentTime.getTime() - 2 * 60 * 1000); // Current time minus 2 minutes
    const untilTime = new Date(currentTime.getTime() + 2 * 60 * 1000); // Current time plus 2 minutes

    const searchParams = {
      verb: 'ListIdentifiers',
      metadataPrefix,
    };

    if (fromDate) {
      searchParams.from = fromDate;
    } else {
      searchParams.from = fromTime.toISOString().replace(/\.\d{3}Z$/, 'Z'); // YYYY-MM-DDTHH:mm:ssZ format without milliseconds
    }

    if (untilDate) {
      searchParams.until = untilDate;
    } else {
      searchParams.until = untilTime.toISOString().replace(/\.\d{3}Z$/, 'Z'); // YYYY-MM-DDTHH:mm:ssZ format without milliseconds
    }

    return cy
      .okapiRequest({
        method: 'GET',
        path: 'oai/records',
        searchParams,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: true,
      })
      .then((response) => {
        return response.body;
      });
  },

  /**
   * Verifies that MARC Leader position 05 has a specific value for a specific record identified by instanceUuid.
   * Works consistently for both single-record (GetRecord) and multi-record (ListRecords) responses.
   * @param {string} xmlString - The XML response as a string
   * @param {string} instanceUuid - The instance UUID to target a specific record (mandatory).
   * @param {string} expectedValue - The expected value for position 05
   */
  verifyMarcLeaderPosition05Value(xmlString, instanceUuid, expectedValue) {
    const xmlDoc = this._parseXmlString(xmlString);
    const namespaceURI = 'http://www.loc.gov/MARC21/slim';

    let targetRecordElement;

    // Always search for the record by instanceUuid - works for both single and multi-record responses
    const records = xmlDoc.getElementsByTagName('record');

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const header = record.getElementsByTagName('header')[0];

      if (header) {
        const identifierElement = header.getElementsByTagName('identifier')[0];

        if (identifierElement) {
          const identifier = identifierElement.textContent;

          if (identifier.includes(instanceUuid)) {
            const metadata = record.getElementsByTagName('metadata')[0];
            if (metadata) {
              targetRecordElement = metadata.getElementsByTagNameNS(namespaceURI, 'record')[0];
            }
            break;
          }
        }
      }
    }

    if (!targetRecordElement) {
      throw new Error(`Record with UUID ${instanceUuid} not found in the response`);
    }

    const leader = targetRecordElement.getElementsByTagNameNS(namespaceURI, 'leader')[0];

    if (!leader) {
      throw new Error(`MARC leader not found in record with UUID ${instanceUuid}`);
    }

    const leaderValue = leader.textContent;
    const position05 = leaderValue.charAt(5);

    expect(
      position05,
      `MARC Leader position 05 should be "${expectedValue}" in record with UUID ${instanceUuid}`,
    ).to.equal(expectedValue);
  },

  /**
   * Verifies that an identifier exists in ListIdentifiers response
   * @param {string} xmlString - The XML response as a string
   * @param {string} instanceUuid - The instance UUID to find
   * @param {boolean} shouldBeDeleted - Whether the identifier should have deleted status
   */
  verifyIdentifierInListResponse(xmlString, instanceUuid, shouldBeDeleted = false) {
    const xmlDoc = this._parseXmlString(xmlString);
    const headers = xmlDoc.getElementsByTagName('header');

    // Find the header with matching instance UUID
    let foundHeader = null;
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const identifier = header.getElementsByTagName('identifier')[0].textContent;

      if (identifier.includes(instanceUuid)) {
        foundHeader = header;
        break;
      }
    }

    // Verify the deleted status
    const status = foundHeader.getAttribute('status');

    if (shouldBeDeleted) {
      expect(status, 'Identifier should have deleted status').to.equal('deleted');
    } else {
      expect(status, 'Identifier should not have deleted status').to.be.null;
    }
  },
};
