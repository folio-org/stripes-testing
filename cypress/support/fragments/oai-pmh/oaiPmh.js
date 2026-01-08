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

  /**
   * Private helper method to find a specific record by instanceUuid in OAI-PMH response
   * @param {string} xmlString - The XML response as a string
   * @param {string} instanceUuid - The instance UUID to search for
   * @returns {Element} The record element matching the instanceUuid
   * @throws {Error} If no record with the specified UUID is found
   * @private
   */
  _findRecordInResponseByUuid(xmlString, instanceUuid) {
    const xmlDoc = this._parseXmlString(xmlString);
    const records = xmlDoc.getElementsByTagName('record');

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const header = record.getElementsByTagName('header')[0];

      if (header) {
        const identifierElement = header.getElementsByTagName('identifier')[0];

        if (identifierElement) {
          const identifier = identifierElement.textContent;

          if (identifier.includes(instanceUuid)) {
            return record;
          }
        }
      }
    }

    throw new Error(`Record with UUID ${instanceUuid} not found in the response`);
  },

  getBaseUrl() {
    const cachedBaseUrl = Cypress.env('OAI_PMH_BASE_URL');

    if (cachedBaseUrl) {
      return cy.wrap(cachedBaseUrl);
    }

    return cy.getOaiPmhConfigurations('general').then((body) => {
      // Extract baseUrl from the configuration string
      const configValue = body?.configurationSettings[0]?.configValue;
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

    const targetRecord = this._findRecordInResponseByUuid(xmlString, instanceUuid);
    const targetHeader = targetRecord.getElementsByTagName('header')[0];

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
   * Verify MARC control field value in a specific record identified by instanceUuid.
   * Control fields (001-009) do not have indicators or subfields, just text content.
   * @param {string} xmlString - The XML response as a string.
   * @param {string} instanceUuid - The instance UUID to target a specific record (mandatory).
   * @param {string} tag - The tag of the MARC control field to verify (e.g., "001", "003", "005", "008").
   * @param {string} expectedValue - The expected value of the control field.
   */
  verifyMarcControlField(xmlString, instanceUuid, tag, expectedValue) {
    const namespaceURI = 'http://www.loc.gov/MARC21/slim';

    const targetRecord = this._findRecordInResponseByUuid(xmlString, instanceUuid);
    const metadata = targetRecord.getElementsByTagName('metadata')[0];

    if (!metadata) {
      throw new Error(`Metadata not found in record with UUID ${instanceUuid}`);
    }

    const targetRecordElement = metadata.getElementsByTagNameNS(namespaceURI, 'record')[0];

    if (!targetRecordElement) {
      throw new Error(`MARC record element not found in record with UUID ${instanceUuid}`);
    }

    const controlfields = targetRecordElement.getElementsByTagNameNS(namespaceURI, 'controlfield');
    const controlfield = Array.from(controlfields).find(
      (field) => field.getAttribute('tag') === tag,
    );

    if (!controlfield) {
      throw new Error(`MARC control field ${tag} not found in record with UUID ${instanceUuid}`);
    }

    expect(
      controlfield.textContent,
      `Control field ${tag} should have value "${expectedValue}" in record with UUID ${instanceUuid}`,
    ).to.equal(expectedValue);
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
    // Use the namespace URI for MARC21
    const namespaceURI = 'http://www.loc.gov/MARC21/slim';

    const targetRecord = this._findRecordInResponseByUuid(xmlString, instanceUuid);
    const metadata = targetRecord.getElementsByTagName('metadata')[0];

    if (!metadata) {
      throw new Error(`Metadata not found in record with UUID ${instanceUuid}`);
    }

    const targetRecordElement = metadata.getElementsByTagNameNS(namespaceURI, 'record')[0];

    if (!targetRecordElement) {
      throw new Error(`MARC record element not found in record with UUID ${instanceUuid}`);
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
      throw new Error(
        `MARC field ${tag} with indicators ${JSON.stringify(indicators)} not found in record with UUID ${instanceUuid}`,
      );
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
   * Verify MARC fields with the same tag and indicators, handling multiple occurrences.
   * This method can verify multiple fields with the same tag/indicators and their subfields.
   * @param {string} xmlString - The XML response as a string.
   * @param {string} instanceUuid - The instance UUID to target a specific record (mandatory).
   * @param {string} tag - The tag of the MARC field to verify (e.g., "856").
   * @param {Object} indicators - Object containing the indicators (e.g., { ind1: "4", ind2: "0" }).
   * @param {Array} expectedFields - Array of objects, each containing expected subfields for each occurrence
   *   (e.g., [{ a: "value1", b: "value2" }, { a: "value3", c: "value4" }]).
   * @param {number} expectedCount - Expected number of fields with the same tag/indicators (optional).
   * @param {Array} absentSubfields - Array of subfield codes that should NOT exist in any field (e.g., ["x", "y"]).
   */
  verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
    xmlString,
    instanceUuid,
    tag,
    indicators = {},
    expectedFields = [],
    expectedCount = null,
    absentSubfields = [],
  ) {
    // Use the namespace URI for MARC21
    const namespaceURI = 'http://www.loc.gov/MARC21/slim';

    const targetRecord = this._findRecordInResponseByUuid(xmlString, instanceUuid);
    const metadata = targetRecord.getElementsByTagName('metadata')[0];

    if (!metadata) {
      throw new Error(`Metadata not found in record with UUID ${instanceUuid}`);
    }

    const targetRecordElement = metadata.getElementsByTagNameNS(namespaceURI, 'record')[0];

    if (!targetRecordElement) {
      throw new Error(`MARC record element not found in record with UUID ${instanceUuid}`);
    }

    // Find all `datafield` elements within the target record that match tag and indicators
    const datafields = targetRecordElement.getElementsByTagNameNS(namespaceURI, 'datafield');
    const matchingFields = Array.from(datafields).filter((datafield) => {
      const matchesTag = datafield.getAttribute('tag') === tag;
      const matchesInd1 = !indicators.ind1 || datafield.getAttribute('ind1') === indicators.ind1;
      const matchesInd2 = !indicators.ind2 || datafield.getAttribute('ind2') === indicators.ind2;

      return matchesTag && matchesInd1 && matchesInd2;
    });

    if (matchingFields.length === 0) {
      throw new Error(
        `No MARC fields ${tag} with indicators ${JSON.stringify(indicators)} found in record with UUID ${instanceUuid}`,
      );
    }

    // Verify expected count if specified
    if (expectedCount !== null) {
      expect(
        matchingFields.length,
        `Expected ${expectedCount} fields with tag ${tag} and indicators ${JSON.stringify(indicators)} in record with UUID ${instanceUuid}`,
      ).to.equal(expectedCount);
    }

    // Verify each expected field configuration
    expectedFields.forEach((expectedSubfields, fieldIndex) => {
      if (fieldIndex >= matchingFields.length) {
        throw new Error(
          `Field index ${fieldIndex} exceeds available fields (${matchingFields.length}) for tag ${tag} in record with UUID ${instanceUuid}`,
        );
      }

      const field = matchingFields[fieldIndex];
      const subfieldsAll = field.getElementsByTagNameNS(namespaceURI, 'subfield');

      // Verify each expected subfield in this field occurrence
      Object.entries(expectedSubfields).forEach(([subfieldCode, expectedValue]) => {
        const subfield = Array.from(subfieldsAll).filter(
          (sf) => sf.getAttribute('code') === subfieldCode,
        );

        if (subfield.length === 0) {
          throw new Error(
            `Subfield "${subfieldCode}" not found in ${tag} field occurrence ${fieldIndex} of record with UUID ${instanceUuid}`,
          );
        }

        // For multiple subfields with same code, verify the first one
        expect(
          subfield[0].textContent,
          `Subfield "${subfieldCode}" of ${tag} field with indicators ${JSON.stringify(indicators)} occurrence ${fieldIndex} should have value "${expectedValue}" in record with UUID ${instanceUuid}`,
        ).to.equal(expectedValue);
      });

      // Verify absent subfields in this field occurrence
      absentSubfields.forEach((subfieldCode) => {
        const subfield = Array.from(subfieldsAll).find(
          (sf) => sf.getAttribute('code') === subfieldCode,
        );

        expect(
          subfield,
          `Subfield "${subfieldCode}" should NOT exist in ${tag} field occurrence ${fieldIndex} of record with UUID ${instanceUuid}`,
        ).to.be.undefined;
      });
    });
  },

  /**
   * Verify Dublin Core field values in a specific record identified by instanceUuid.
   * Works consistently for both single-record (GetRecord) and multi-record (ListRecords) responses.
   * @param {string} xmlString - The XML response as a string.
   * @param {string} instanceUuid - The instance UUID to target a specific record (mandatory).
   * @param {Object} fields - Object where keys are Dublin Core element names and values are expected values (e.g., { title: "Sample Title", type: "Text", language: "eng" }).
   * @param {Array} absentFields - Array of Dublin Core element names that should NOT exist (e.g., ["relation", "coverage"]).
   */
  verifyDublinCoreField(xmlString, instanceUuid, fields = {}, absentFields = []) {
    const targetRecord = this._findRecordInResponseByUuid(xmlString, instanceUuid);
    const metadata = targetRecord.getElementsByTagName('metadata')[0];

    if (!metadata) {
      throw new Error(`Metadata not found in record with UUID ${instanceUuid}`);
    }

    // Use the namespace URI for Dublin Core
    const dcNamespaceURI = 'http://purl.org/dc/elements/1.1/';

    Object.entries(fields).forEach(([elementName, expectedValue]) => {
      // Find all Dublin Core elements with the specified name within the target record
      const dcElements = metadata.getElementsByTagNameNS(dcNamespaceURI, elementName);

      if (dcElements.length === 0) {
        throw new Error(
          `Dublin Core element "${elementName}" not found in record with UUID ${instanceUuid}`,
        );
      }

      const element = dcElements[0];

      expect(
        element.textContent,
        `Dublin Core element "${elementName}" should have value "${expectedValue}" in record with UUID ${instanceUuid}`,
      ).to.equal(expectedValue);
    });

    // Verify absent fields
    absentFields.forEach((elementName) => {
      const dcElements = metadata.getElementsByTagNameNS(dcNamespaceURI, elementName);

      expect(
        dcElements.length,
        `Dublin Core element "${elementName}" should NOT exist in record with UUID ${instanceUuid}`,
      ).to.equal(0);
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
    const searchParams = {
      verb: 'ListIdentifiers',
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
   * Verifies that MARC Leader position 05 has a specific value for a specific record identified by instanceUuid.
   * Works consistently for both single-record (GetRecord) and multi-record (ListRecords) responses.
   * @param {string} xmlString - The XML response as a string
   * @param {string} instanceUuid - The instance UUID to target a specific record (mandatory).
   * @param {string} expectedValue - The expected value for position 05
   */
  verifyMarcLeaderPosition05Value(xmlString, instanceUuid, expectedValue) {
    const namespaceURI = 'http://www.loc.gov/MARC21/slim';

    const targetRecord = this._findRecordInResponseByUuid(xmlString, instanceUuid);
    const metadata = targetRecord.getElementsByTagName('metadata')[0];

    if (!metadata) {
      throw new Error(`Metadata not found in record with UUID ${instanceUuid}`);
    }

    const targetRecordElement = metadata.getElementsByTagNameNS(namespaceURI, 'record')[0];

    if (!targetRecordElement) {
      throw new Error(`MARC record element not found in record with UUID ${instanceUuid}`);
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
   * Verifies identifier presence/absence in ListIdentifiers response and validates format and status when found.
   * Performs comprehensive verification including identifier format validation and deletion status checking.
   * @param {string} xmlString - The XML response as a string from ListIdentifiers request
   * @param {string} instanceUuid - The instance UUID to find in the response (mandatory)
   * @param {boolean} shouldExist - Whether the identifier should exist in the response (default: true)
   * @param {boolean} shouldBeDeleted - Whether the identifier should have deleted status (default: false). Ignored when shouldExist is false.
   */
  verifyIdentifierInListResponse(
    xmlString,
    instanceUuid,
    shouldExist = true,
    shouldBeDeleted = false,
  ) {
    const xmlDoc = this._parseXmlString(xmlString);
    const headers = xmlDoc.getElementsByTagName('header');

    // Find the header with matching instance UUID
    let foundHeader = null;
    let foundIdentifier = null;
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const identifier = header.getElementsByTagName('identifier')[0].textContent;

      if (identifier.includes(instanceUuid)) {
        foundHeader = header;
        foundIdentifier = identifier;
        break;
      }
    }

    if (!shouldExist) {
      // Verify the identifier should NOT exist (shouldBeDeleted is ignored in this case)
      expect(
        foundHeader,
        `Identifier with UUID ${instanceUuid} should NOT be found in the ListIdentifiers response`,
      ).to.be.null;
      return;
    }

    // Verify the identifier should exist
    if (!foundHeader) {
      throw new Error(
        `Identifier with UUID ${instanceUuid} not found in the ListIdentifiers response`,
      );
    }

    // Verify the identifier format
    this.getBaseUrl().then((baseUrl) => {
      const expectedIdentifier = `oai:${baseUrl}:${Cypress.env('OKAPI_TENANT')}/${instanceUuid}`;
      expect(
        foundIdentifier,
        `Identifier should match expected OAI format for UUID ${instanceUuid}`,
      ).to.equal(expectedIdentifier);
    });

    // Verify the deleted status
    const status = foundHeader.getAttribute('status');

    if (shouldBeDeleted) {
      expect(status, `Identifier should have deleted status for UUID ${instanceUuid}`).to.equal(
        'deleted',
      );
    } else {
      expect(status, `Identifier should not have deleted status for UUID ${instanceUuid}`).to.be
        .null;
    }
  },

  /**
   * Verifies the OAI-PMH error response for "idDoesNotExist" error
   * @param {string} xmlString - The XML response as a string
   * @param {string} expectedErrorCode - The expected error code (default: 'idDoesNotExist')
   * @param {string} expectedErrorMessage - The expected error message (default: 'No matching identifier in repository.')
   */
  verifyIdDoesNotExistError(
    xmlString,
    expectedErrorCode = 'idDoesNotExist',
    expectedErrorMessage = 'No matching identifier in repository.',
  ) {
    const xmlDoc = this._parseXmlString(xmlString);
    const errorElement = xmlDoc.getElementsByTagName('error')[0];
    const errorCode = errorElement.getAttribute('code');
    const records = xmlDoc.getElementsByTagName('record');
    const errorText = errorElement.textContent;

    expect(errorCode, 'Error code should match expected value').to.equal(expectedErrorCode);
    expect(errorText, 'Error message should match expected value').to.equal(expectedErrorMessage);
    expect(records.length, 'No record element should exist in error response').to.equal(0);
  },
};
