import { Button, Checkbox, List, MultiSelect } from '../../../interactors';

describe('ui-eholdings: Search providers', () => {
  beforeEach('navigates to eHoldings', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/eholdings');
  });

  describe('searching by provider name', () => {
    beforeEach(() => {
      cy.search('EBSCO');
    });

    it('should display two results', () => {
      cy.expect(List().has({ count: 2 }));
    });
  });

  describe('searching by single tag', () => {
    beforeEach(() => {
      cy.do([
        Button('Tags').click(),
        Checkbox('Search by tags only').click(),
        MultiSelect().select(['important']),
      ]);
    });

    // FIXME: There are no results
    it('should display list of providers with important tag', () => {
      cy.expect(List().has({ count: 2 }));
    });
  });

  describe('searching by multiple tags', () => {
    beforeEach(() => {
      cy.do([
        Button('Tags').click(),
        Checkbox('Search by tags only').click(),
        MultiSelect().select(['important', 'urgent']),
      ]);
    });

    // FIXME: There are no results
    it('should display list of providers with important and urgent tags', () => {
      cy.expect(List().has({ count: 3 }));
    });
  });
});
