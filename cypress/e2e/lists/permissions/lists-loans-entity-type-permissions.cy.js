import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Permissions', () => {
    let userDataNoLoans = {};
    let userDataNoInventory = {};
    let userDataWithLoans = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userDataNoLoans = userProperties;
      });
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.loansAll.gui,
      ]).then((userProperties) => {
        userDataNoInventory = userProperties;
      });
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.loansAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userDataWithLoans = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userDataNoLoans.userId);
      Users.deleteViaApi(userDataNoInventory.userId);
      Users.deleteViaApi(userDataWithLoans.userId);
    });

    it(
      'C490871 Verify that it\'s not possible to access the Loans entity type without a proper User permissions (corsair)',
      { tags: ['extendedPath', 'corsair', 'C490871'] },
      () => {
        cy.login(userDataNoLoans.username, userDataNoLoans.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Click on the "New" button
        Lists.openNewListPane();

        // #2-3 Click on "Record type" dropdown and search for "Loans"
        Lists.openRecordTypeDropdownAndSearchOption('Loans');
        Lists.verifyRecordTypeAbsentInDropdownOptions();
      },
    );

    it(
      'C490873 Verify that it\'s not possible to access the Loans entity type without a proper Inventory permissions (corsair)',
      { tags: ['criticalPath', 'corsair', 'C490873'] },
      () => {
        cy.login(userDataNoInventory.username, userDataNoInventory.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Click on the "New" button
        Lists.openNewListPane();

        // #2-3 Click on "Record type" dropdown and search for "Loans"
        Lists.openRecordTypeDropdownAndSearchOption('Loans');
        Lists.verifyRecordTypeAbsentInDropdownOptions();
      },
    );

    it(
      'C490869 [Users: User loans view, change due date, renew] Verify that it\'s possible to access the Loans entity when Lists app permissions assigned (corsair)',
      { tags: ['extendedPath', 'corsair', 'C490869'] },
      () => {
        cy.login(userDataWithLoans.username, userDataWithLoans.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Check the "Record types" dropdown in the "Filters" pane
        // #2 Click on the "New" button
        Lists.openNewListPane();

        // #3 Click on "Record type" dropdown
        Lists.verifyRecordTypes(['Holdings', 'Instances', 'Items', 'Loans', 'Users']);

        // #4 Search for the "Loans" record type and select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Loans');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Loans');
      },
    );
  });
});
