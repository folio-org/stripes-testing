import TopMenu from '../../support/fragments/topMenu';
import Actions from '../../support/fragments/inventory/actions';

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
});
