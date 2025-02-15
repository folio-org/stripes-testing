import LinkedDataEditor from './linkedDataEditor';

export default {
  waitLoading() {
    cy.xpath('//div[@data-testid="modal"]//h3[text()="Advanced search"]').should('be.visible');
  },

  setFirstCondition() {},

  setAdditionalCondition() {},

  clickSearch() {
    cy.xpath("//button[@data-testid='modal-button-submit']").click();
    // LDE is displayed
    LinkedDataEditor.waitLoading();
  },
};
