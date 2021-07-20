describe('ui-eholdings: Provider Edit', () => {
  before('logs in and navigates to eHoldings', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/eholdings');
  });

  describe('visiting Provider Edit page', () => {
    before('searching and opening provider', () => {
      cy.search('EBSCO');
      cy.get('#search-results-content li:first-child').click();
    });

    describe('changing provider proxy', () => {
      before(() => {
        cy.get('#provider-edit-link').click();
        cy.get('#eholdings-proxy-id').select('mjproxy');
        cy.get('#provider-edit-form').submit();
        cy.get('#provider-edit-link', { timeout: 2000 });
        cy.reload();
      });

      it('should open Provider Show page', () => {
        cy.location().should(loc => {
          expect(loc.href).to.match(/\/eholdings\/providers\/\d+/);
        });
      });

      it('should show correct proxy value', () => {
        cy.get('#proxy-display').contains('MJProxy');
      });
    });
  });
});
