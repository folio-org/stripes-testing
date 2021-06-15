describe('ui-eholdings: Provider Edit', () => {
  before('logs in and navigates to eHoldings', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/eholdings');
  });

  describe('visiting Provider Edit page', () => {
    before('searching and opening provider', () => {
      cy.search('EBSCO');
      cy.get('#search-results-content li:first').click();
      cy.wait(2000);
    });

    describe('changing provider proxy', () => {
      beforeEach(() => {
        cy.get('#provider-edit-link').click();
        cy.wait(100);
        cy.get('#eholdings-proxy-id').select('mjproxy');
        cy.get('#provider-edit-form').submit();
        cy.wait(1000);
        cy.reload();
        cy.wait(1000);
      });

      it('should open Provider Show page', () => {
        cy.url().should('match', /\/eholdings\/providers\/\d+/);
      });

      it('should show correct proxy value', () => {
        cy.get('#proxy-display').should('have.text', 'MJProxy');
      });
    });
  });
});
