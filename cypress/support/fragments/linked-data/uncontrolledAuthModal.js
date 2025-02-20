export default {
  closeIfDisplayed() {
    cy.get('div[class="modal modal-uncontrolled-authorities-warning"]').then((modal) => {
      if (modal.is(':visible')) {
        cy.xpath('//button[@data-testid="modal-button-submit"]').click();
        cy.wait(1000);
      }
    });
  },
};
