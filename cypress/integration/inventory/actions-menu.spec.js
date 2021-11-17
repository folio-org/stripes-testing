import TopMenu from '../../support/fragments/topMenu';
import Actions from '../../support/fragments/inventory/actions';
import InventorySearchPanel from '../../support/fragments/inventory/InventorySearchPanel';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to Actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', () => {
    const optionsShouldDisabled = [
      Actions.saveUUIDOption,
      Actions.saveCQLQueryOption,
      Actions.exportMARCOption,
      Actions.showSelectedRecordsOption
    ];

    Actions.open()
      .then(() => {
        optionsShouldDisabled.forEach(option => Actions.optionIsDisabled(option, true));
      });
  });

  it('C196753 verifies action menu options after searching and selecting result', () => {
    const optionsShouldEnabled = [
      Actions.saveUUIDOption,
      Actions.saveCQLQueryOption,
      Actions.exportMARCOption,
      Actions.showSelectedRecordsOption,
    ];

    cy.do(InventorySearchPanel.effectiveLocationInput.select([InventorySearchPanel.effectiveLocationValues.mainLibrary]))
      .then(() => InventorySearchPanel.selectAllCheckboxResult())
      .then(() => Actions.open())
      .then(() => optionsShouldEnabled.forEach(option => Actions.optionIsDisabled(option, false)));
  });
});
