import TopMenu from "../../support/fragments/topMenu";
import Actions from "../../support/fragments/inventory/actions";

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
});
