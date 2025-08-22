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
      return cachedBaseUrl;
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
   * Verifies the instance status in the OAI-PMH response header.
   * @param {string} xmlString - The XML response as a string.
   * @param {boolean} shouldBeDeleted - Whether the instance should be deleted (true) or not deleted (false).
   */
  verifyInstanceStatus(xmlString, shouldBeDeleted = false, instanceId) {
    const xmlDoc = this._parseXmlString(xmlString);
    const header = xmlDoc.getElementsByTagName('header')[0];
    const status = header.getAttribute('status');
    const identifier = header.getElementsByTagName('identifier')[0].textContent;

    if (shouldBeDeleted) {
      expect(status, 'Header status should be "deleted" for deleted instance').to.equal('deleted');
      expect(identifier, 'Identifier should contain the instance UUID').to.equal(
        `oai:${this.getBaseUrl()}:${Cypress.env('OKAPI_TENANT')}/${instanceId}`,
      );
    } else {
      expect(status, 'Header status should be absent (null) for non-deleted instance').to.be.null;
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
};
