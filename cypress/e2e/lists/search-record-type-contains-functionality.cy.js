import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Lists', () => {
  describe('Record type search', () => {
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C476720 "Search record types" functionality works with "Contains" operator (corsair)',
      { tags: ['extendedPath', 'corsair', 'C476720'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Click on the "New" button
        Lists.openNewListPane();

        // #2 Click on the "Select record type" dropdown
        Lists.openRecordTypeDropdown();

        // #3 Search for the entity type "org"
        Lists.searchOptionInRecordTypeDropdown('org');
        Lists.verifyRecordTypeDropdownOptions('Organizations');

        // #4 Clear search and search for "Purchase order lines", select it
        Lists.searchOptionInRecordTypeDropdownAndSelectIt('Purchase order lines');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Purchase order lines');
      },
    );

    it(
      'C466317 Verify that displays correct message when there are no available record types (corsair)',
      { tags: ['extendedPath', 'corsair', 'C466317'] },
      () => {
        cy.loginAsAdmin({
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Click on the "New" button
        Lists.openNewListPane();
        Lists.verifySaveButtonIsDisabled();
        Lists.verifyCancelButtonIsActive();

        // #2 Click on the "Select record type" dropdown
        Lists.openRecordTypeDropdown();

        // #3 Search for an invalid record type "Test-Type"
        Lists.searchOptionInRecordTypeDropdown('Test-Type');
        Lists.verifyRecordTypeAbsentInDropdownOptions();
      },
    );
  });
});
