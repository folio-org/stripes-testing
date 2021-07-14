import { Button, Checkbox, List, MultiSelect, MultiSelectOption } from '../../../interactors';

describe('ui-eholdings: Search providers', () => {
  before('navigates to eHoldings', () => {
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
        MultiSelect().click(),
        MultiSelectOption('important').click()
      ]);
    });

    // FIXME: There are no results
    it('should display list of providers with important tag', () => {
      cy.expect(List().has({ count: 2 }));
    });

    afterEach(() => {
      // NOTE: [object Object] ¯\_(ツ)_/¯
      cy.do(Button({ ariaLabel: 'Clear selected filters for "[object Object]"' }).click());
      cy.reload();
    });
  });

  describe('searching by multiple tags', () => {
    beforeEach(() => {
      cy.do([
        Button('Tags').click(),
        Checkbox('Search by tags only').click(),
        MultiSelect().click(),
        MultiSelectOption('important').click(),
        MultiSelectOption('urgent').click(),
      ]);
    });

    // FIXME: There are no results
    it('should display list of providers with important and urgent tags', () => {
      cy.expect(List().has({ count: 3 }));
    });

    afterEach(() => {
      cy.do(Button({ ariaLabel: 'Clear selected filters for "[object Object]"' }).click());
      cy.reload();
    });
  });
});
