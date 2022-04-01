import TopMenu from '../../support/fragments/topMenu';
import FilterItems from '../../support/fragments/inventory/filterItems';
import permissions from '../../support/dictionary/permissions';
import { MultiColumnList } from '../../../interactors';



describe('ui-inventory: items with status', () => {
  beforeEach('navigates to items with status', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('should filter items with status', () => {
    cy.intercept('GET', '/inventory/items?*').as('getInstanceRelationshipTypes');
    FilterItems.switchToItem();
    FilterItems.toggleItemStatusAccordion();
    FilterItems.toggleStatus('Available');
    cy.expect(MultiColumnList().absent());
    FilterItems.selectFirstItem();
    FilterItems.waitLoading();
    FilterItems.toggleStatus('Available');
    cy.expect(MultiColumnList().absent());
  });
});
