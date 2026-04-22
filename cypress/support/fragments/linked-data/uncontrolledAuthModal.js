export default {
  closeIfDisplayed() {
    cy.get('body').then(($body) => {
      if ($body.find('div[class="modal modal-uncontrolled-authorities-warning"]').length > 0) {
        cy.xpath('//button[@data-testid="modal-button-submit"]').click();
        cy.wait(1000);
      }
    });
  },
};
