import TopMenu from '../../support/fragments/topMenu';
import Actions from '../../support/fragments/inventory/actions';
import InventorySearchPanel from '../../support/fragments/inventory/InventorySearchPanel';
import { Checkbox } from '../../../interactors';

describe('ui-inventory: actions', () => {
  beforeEach('navigates to Actions', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', () => {
    Actions.openActions();

    Actions.optionIsDisabled(Actions.saveUUIDOption, true);
    Actions.optionIsDisabled(Actions.saveCQLQueryOption, true);
    Actions.optionIsDisabled(Actions.exportMARCOption, true);
    Actions.optionIsDisabled(Actions.showSelectedRecordsOption, true);
  });

  it.only('C196753 verifies the action menu options after searching and selecting result', () => {
    cy.do([
      InventorySearchPanel.effectiveLocationInput.select([InventorySearchPanel.effectiveLocationValues.mainLibrary]),
      Checkbox({ 'id': 'checkbox-154' }).click(),
      Actions.actionsBtn.click()
    ]);

    Actions.optionIsDisabled(Actions.saveUUIDOption, false);
    Actions.optionIsDisabled(Actions.saveCQLQueryOption, false);
    Actions.optionIsDisabled(Actions.exportMARCOption, false);
    Actions.optionIsDisabled(Actions.showSelectedRecordsOption, false);
  });
});
