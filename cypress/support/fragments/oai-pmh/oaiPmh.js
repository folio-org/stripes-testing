/* eslint-disable no-unused-expressions */
export default {
  /**
   * Sends a GET request to the OAI-PMH GetRecord endpoint
   * @param {string} instanceUuid - The instance UUID to retrieve
   * @param {string} metadataPrefix - The metadata format (default: 'marc21')
   * @returns {Cypress.Chainable} The response body from the OAI-PMH request
   */
  getRecordRequest(instanceUuid, metadataPrefix = 'marc21') {
    const identifier = `oai:folio.org:${Cypress.env('OKAPI_TENANT')}/${instanceUuid}`;

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
        failOnStatusCode: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  /**
   * Helper function to verify MARC field and subfield values.
   * @param {string} xmlString - The XML response as a string.
   * @param {string} tag - The tag of the MARC field to verify (e.g., "999").
   * @param {Object} indicators - Object containing the indicators (e.g., { ind1: "f", ind2: "f" }).
   * @param {Object} subfields - Object where keys are subfield codes and values are expected values (e.g., { t: "0", i: "12345" }).
   */
  verifyMarcField(xmlString, tag, indicators = {}, subfields = {}) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

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

    // Verify subfields
    Object.entries(subfields).forEach(([subfieldCode, expectedValue]) => {
      const subfieldsAll = field.getElementsByTagNameNS(namespaceURI, 'subfield');
      const subfield = Array.from(subfieldsAll).find(
        (sf) => sf.getAttribute('code') === subfieldCode,
      );

      // Assert that the subfield has the expected value
      expect(
        subfield.textContent,
        `Subfield "${subfieldCode}" should have value "${expectedValue}"`,
      ).to.equal(expectedValue);
    });
  },
};
