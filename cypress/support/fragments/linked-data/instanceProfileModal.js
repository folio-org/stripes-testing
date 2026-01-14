const instanceProfileModal = 'div[class="modal modal-choose-profile"]';

export default {
  waitLoading() {
    cy.get(instanceProfileModal).should('be.visible');
  },
  checkOptionSelected(option) {
    cy.get(instanceProfileModal).then((modal) => {
      if (modal.is(':visible')) {
        // verify selected option
        cy.get('select#select-profile option:selected').should('have.text', option);
      } else {
        cy.log('Instance profile modal is not displayed');
      }
    });
  },
  selectDefaultOption() {
    cy.get(instanceProfileModal).then((modal) => {
      if (modal.is(':visible')) {
        cy.xpath('//button[@data-testid="modal-button-submit"]').click();
        cy.wait(1000);
      }
    });
  },
};
