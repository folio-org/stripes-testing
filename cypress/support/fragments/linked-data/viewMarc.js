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

  closeMarcView() {
    cy.xpath(closeButton).click();
    cy.wait(500);
  },
};
