/* eslint-disable no-unused-expressions */
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
   * Verifies the OAI-PMH record header including identifier and status.
   * @param {string} xmlString - The XML response as a string.
   * @param {string} instanceId - The instance UUID to verify in the identifier.
   * @param {boolean} shouldBeDeleted - Whether the instance should have deleted status (default: false).
   * @param {boolean} verifyIdentifier - Whether to verify the identifier format (default: true).
   */
  verifyOaiPmhRecordHeader(
    xmlString,
    instanceId,
    shouldBeDeleted = false,
    verifyIdentifier = true,
  ) {
    const expectedStatus = shouldBeDeleted ? 'deleted' : null;

    const xmlDoc = this._parseXmlString(xmlString);
    const header = xmlDoc.getElementsByTagName('header')[0];

    // Verify status attribute
    const status = header.getAttribute('status');
    if (expectedStatus === null) {
      expect(status, 'Header status should be absent (null) for active records').to.be.null;
    } else {
      expect(status, `Header status should be "${expectedStatus}"`).to.equal(expectedStatus);
    }

    // Verify identifier
    if (verifyIdentifier) {
      const identifierElement = header.getElementsByTagName('identifier')[0];
      const identifier = identifierElement.textContent;

      this.getBaseUrl().then((baseUrl) => {
        const expectedIdentifier = `oai:${baseUrl}:${Cypress.env('OKAPI_TENANT')}/${instanceId}`;
        expect(identifier, 'Identifier should match expected OAI format').to.equal(
          expectedIdentifier,
        );
      });
    }
  },

  /**
   * Verify MARC field and subfield values.
   * @param {string} xmlString - The XML response as a string.
   * @param {string} tag - The tag of the MARC field to verify (e.g., "999").
   * @param {Object} indicators - Object containing the indicators (e.g., { ind1: "f", ind2: "f" }).
   * @param {Object} subfields - Object where keys are subfield codes and values are expected values (e.g., { t: "0", i: "12345" }).
   */
  verifyMarcField(xmlString, tag, indicators = {}, subfields = {}) {
    const xmlDoc = this._parseXmlString(xmlString);

    // Use the namespace URI for MARC21
    const namespaceURI = 'http://www.loc.gov/MARC21/slim';

    // Find all `datafield` elements in the MARC namespace
    const datafields = xmlDoc.getElementsByTagNameNS(namespaceURI, 'datafield');
    const field = Array.from(datafields).find((datafield) => {
      const matchesTag = datafield.getAttribute('tag') === tag;
      const matchesInd1 = !indicators.ind1 || datafield.getAttribute('ind1') === indicators.ind1;
      const matchesInd2 = !indicators.ind2 || datafield.getAttribute('ind2') === indicators.ind2;

      return matchesTag && matchesInd1 && matchesInd2;
    });

    Object.entries(subfields).forEach(([subfieldCode, expectedValue]) => {
      const subfieldsAll = field.getElementsByTagNameNS(namespaceURI, 'subfield');
      const subfield = Array.from(subfieldsAll).find(
        (sf) => sf.getAttribute('code') === subfieldCode,
      );

      // Assert that the subfield has the expected value
      expect(
        subfield.textContent,
        `Subfield "${subfieldCode}" of ${tag} field should have value "${expectedValue}"`,
      ).to.equal(expectedValue);
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
};
