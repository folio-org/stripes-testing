const closeButton = "//button[@data-testid='nav-close-button']";

export default {
  waitLoading() {
    cy.xpath("//div[@class='view-marc-modal']").should('be.visible');
  },

  checkMarcContainsData(data) {
    cy.xpath(`//td[contains(normalize-space(), '${data}')]`).should('be.visible');
  },

  closeMarcView() {
    cy.xpath(closeButton).click();
  },
};
