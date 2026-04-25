const profileModalSelector = 'div[class="modal modal-choose-profile"]';

export default {
  waitLoading() {
    cy.get(profileModalSelector).should('be.visible');
  },
  checkOptionSelected(option) {
    cy.get(profileModalSelector).then((modal) => {
      if (modal.is(':visible')) {
        // verify selected option
        cy.get('select#select-profile option:selected').should('have.text', option);
      } else {
        cy.log('Work profile modal is not displayed');
      }
    });
  },
  toggleDefaultProfile() {
    cy.xpath('//input[@type="checkbox"][@name="My default work profile"]')
      .click();
  },
  selectDefaultOption() {
    cy.get(profileModalSelector).then((modal) => {
      if (modal.is(':visible')) {
        cy.xpath('//button[@data-testid="modal-button-submit"]').click();
        cy.wait(1000);
      }
    });
  },
};
