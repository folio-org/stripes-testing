const closeButton = "//button[@data-testid='nav-close-button']";

export default {
  waitLoading() {
    cy.xpath("//div[@class='view-marc-modal']").should('be.visible');
  },

  checkMarcContainsData(data) {
    cy.xpath(`//td[contains(normalize-space(), '${data}')]`).should('be.visible');
  },

  checkMarcFieldContainsData(fieldCode, data) {
    cy.xpath(`//td[@class='field-code' and text()='${fieldCode}']/following-sibling::td[@class='field-contents' and contains(normalize-space(), '${data}')]`).should('be.visible');
  },

  checkMarcFieldContainsDataAtPosition(fieldCode, position, data) {
    const length = data.length;
    cy.xpath(`//td[@class='field-code' and text()='${fieldCode}']/following-sibling::td[@class='field-contents' and substring(text(), ${position}, ${length})='${data}']`).should('be.visible');
  },

  checkMarcFieldIndicators(fieldCode, indicators) {
    cy.xpath(`//td[@class='field-code' and text()='${fieldCode}']/following-sibling::td[@class='field-indicators' and text()='${indicators}']`).should('be.visible');
  },

  checkMarcFieldContainsOneOfDataAtPosition(fieldCode, position, length, dataOptions) {
    cy.xpath(`//td[@class='field-code' and text()='${fieldCode}']/following-sibling::td[@class='field-contents']`).then((contents) => {
      const textAtPos = contents.text().substr(position, length);
      expect(dataOptions.includes(textAtPos));
    });
  },

  closeMarcView() {
    cy.xpath(closeButton).click();
    cy.wait(500);
  },
};
