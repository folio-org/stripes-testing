describe('ui-eholdings: Search providers', () => {
  before('logs in and navigates to eHoldings', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/eholdings');
  });

  after(() => {
    cy.logout();
  });

  describe('searching by provider name', () => {
    beforeEach(() => {
      cy.search('EBSCO');
      cy.wait(500);
    });

    it('should display two results', () => {
      cy.get('#search-results-content li').should('have.length', 2);
    });
  });

  describe('searching by single tag', () => {
    beforeEach(() => {
      cy.get('#accordion-toggle-button-accordionTagFilter').click();
      cy.get('#accordionTagFilter input[type="checkbox"]').click();

      cy.get('#selectTagFilter-input').type('important');
      cy.wait(100);
      cy.get('#accordionTagFilter li[class*="multiSelectOption--"]:first').click();
    });

    it('should display list of providers with important tag', () => {
      cy.get('#search-results-content li').should('have.length', 2);
    });

    afterEach(() => {
      cy.get('#accordionTagFilter button[icon="times-circle-solid"').click();
      cy.reload();
    });
  });

  describe('searching by multiple tags', () => {
    beforeEach(() => {
      cy.get('#accordion-toggle-button-accordionTagFilter').click();
      cy.get('#accordionTagFilter input[type="checkbox"]').click();

      cy.get('#selectTagFilter-input').type('important');
      cy.wait(100);
      cy.get('#accordionTagFilter li[class*="multiSelectOption--"]:first').click();

      cy.get('#selectTagFilter-input').type('urgent');
      cy.wait(100);
      cy.get('#accordionTagFilter li[class*="multiSelectOption--"]:first').click();
    });

    it('should display list of providers with important and urgent tags', () => {
      cy.get('#search-results-content li').should('have.length', 3);
    });

    afterEach(() => {
      cy.get('#accordionTagFilter button[icon="times-circle-solid"').click();
      cy.reload();
    });
  });
});
