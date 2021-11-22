import TopMenu from '../../support/fragments/topMenu';
import Actions from '../../support/fragments/inventory/actions';
import InventorySearchPanel from '../../support/fragments/inventory/inventorySearchPanel';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', () => {
    cy.do(Actions.open());

    cy.expect([
      Actions.saveUUIDsOption().is({ disabled: true }),
      Actions.saveCQLQueryOption().is({ disabled: true }),
      Actions.exportMARCOption().is({ disabled: true }),
      Actions.showSelectedRecordsOption().is({ disabled: true }),
    ]);
  });

  it('C196753 verifies action menu options after searching and selecting result', () => {
    cy.do([
      InventorySearchPanel.effectiveLocationInput.select([InventorySearchPanel.effectiveLocationValues.mainLibrary]),
      InventorySearchPanel.firstResultCheckbox().click(),
      Actions.open()
    ]);

    cy.expect([
      Actions.saveUUIDsOption().is({ disabled: false }),
      Actions.saveCQLQueryOption().is({ disabled: false }),
      Actions.exportMARCOption().is({ disabled: false }),
      Actions.showSelectedRecordsOption().is({ disabled: false }),
    ]);
  });
});
