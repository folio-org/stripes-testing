export default {
  selectDefaultOption() {
    cy.get('div[class="modal modal-choose-profile"]').then((modal) => {
      if (modal.is(':visible')) {
        cy.xpath('//button[@data-testid="modal-button-submit"]').click();
        cy.wait(1000);
      }
    });
  },
};
