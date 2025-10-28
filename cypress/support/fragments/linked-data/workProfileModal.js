export default {
  waitLoading() {
    cy.get('div[class="modal modal-choose-profile"]').should('be.visible');
  },
  checkOptionSelected(option) {
    cy.get('div[class="modal modal-choose-profile"]').then((modal) => {
      if (modal.is(':visible')) {
        // verify selected option
        cy.get('select#select-profile option:selected').should('have.text', option);
      } else {
        cy.log('Work profile modal is not displayed');
      }
    });
  },
  selectDefaultOption() {
    cy.get('div[class="modal modal-choose-profile"]').then((modal) => {
      if (modal.is(':visible')) {
        cy.xpath('//button[@data-testid="modal-button-submit"]').click();
        cy.wait(1000);
      }
    });
  },
};
