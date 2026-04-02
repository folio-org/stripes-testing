import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Permissions', () => {
    let userData = {};
    let userDataWithInventory = {};
    let userDataWithHoldings = {};
    let userDataWithInventoryAll = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiInventoryMarkAsMissing.gui,
      ]).then((userProperties) => {
        userDataWithInventory = userProperties;
      });
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.inventoryCRUDHoldings.gui,
      ]).then((userProperties) => {
        userDataWithHoldings = userProperties;
      });
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userDataWithInventoryAll = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      Users.deleteViaApi(userDataWithInventory.userId);
      Users.deleteViaApi(userDataWithHoldings.userId);
      Users.deleteViaApi(userDataWithInventoryAll.userId);
    });

    it(
      'C478274 Verify that it\'s not possible to access the "Holdings/Items/Instances" without a proper permission although Lists app permissions assigned (corsair)',
      { tags: ['criticalPath', 'corsair', 'C478274', 'ecsUnsupported'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Click on the "New" button
        Lists.openNewListPane();

        // #2-3 Click on "Record type" dropdown and search for "Holdings"
        Lists.openRecordTypeDropdownAndSearchOption('Holdings');
        Lists.verifyRecordTypeAbsentInDropdownOptions();

        // #4 Search for the "Items" record type
        Lists.searchOptionInRecordTypeDropdown('Items');
        Lists.verifyRecordTypeAbsentInDropdownOptions();

        // #5 Search for the "Instances" record type
        Lists.searchOptionInRecordTypeDropdown('Instances');
        Lists.verifyRecordTypeAbsentInDropdownOptions();

        // #6 Click on the "x" button to go back to the Lists landing page
        Lists.cancelList();
        Lists.waitLoading();

        // Verify the "Record types" filter dropdown doesn't contain Holdings, Items, Instances
        Lists.searchRecordTypeFilterInDropdown('Items');
        Lists.verifyRecordTypeFilterDropdownNoMatchingItem();

        Lists.searchRecordTypeFilterInDropdown('Holdings');
        Lists.verifyRecordTypeFilterDropdownNoMatchingItem();

        Lists.searchRecordTypeFilterInDropdown('Instances');
        Lists.verifyRecordTypeFilterDropdownNoMatchingItem();
      },
    );

    it(
      'C478272 [Inventory: View, create, edit, mark missing items] Verify that it\'s possible to access the "Holdings", "Items", "Instances" entities when Lists app permissions assigned (corsair)',
      { tags: ['extendedPath', 'corsair', 'C478272'] },
      () => {
        cy.login(userDataWithInventory.username, userDataWithInventory.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Check the "Record types" dropdown in the "Filters" pane
        Lists.openRecordTypeFilter();
        Lists.verifyRecordTypeFilterDropdownContainsOptions(['Holdings', 'Instances', 'Items']);

        // #2 Click on the "New" button
        Lists.openNewListPane();

        // #3-4 Click on "Record type" dropdown and search for "Holdings", select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Holdings');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Holdings');

        // #5-6 Click on "Record type" dropdown and search for "Items", select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Items');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Items');

        // #7-8 Click on "Record type" dropdown and search for "Instances", select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Instances');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Instances');
      },
    );

    it(
      'C478270 [Inventory: View, create, edit, delete holdings] Verify that it\'s possible to access the "Holdings", "Items", "Instances" entities when Lists app permissions assigned (corsair)',
      { tags: ['extendedPath', 'corsair', 'C478270'] },
      () => {
        cy.login(userDataWithHoldings.username, userDataWithHoldings.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Check the "Record types" dropdown in the "Filters" pane
        Lists.openRecordTypeFilter();
        Lists.verifyRecordTypeFilterDropdownContainsOptions(['Holdings', 'Instances', 'Items']);

        // #2 Click on the "New" button
        Lists.openNewListPane();

        // #3-4 Click on "Record type" dropdown and search for "Holdings", select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Holdings');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Holdings');

        // #5-6 Click on "Record type" dropdown and search for "Items", select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Items');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Items');

        // #7-8 Click on "Record type" dropdown and search for "Instances", select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Instances');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Instances');
      },
    );

    it(
      'C477584 [Inventory: All permissions] Verify that it\'s possible to access the "Holdings", "Items", "Instances" entities when Lists app permissions assigned (corsair)',
      { tags: ['extendedPath', 'corsair', 'C477584'] },
      () => {
        cy.login(userDataWithInventoryAll.username, userDataWithInventoryAll.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Check the "Record types" dropdown in the "Filters" pane
        Lists.openRecordTypeFilter();
        Lists.verifyRecordTypeFilterDropdownContainsOptions(['Holdings', 'Instances', 'Items']);

        // #2 Click on the "New" button
        Lists.openNewListPane();

        // #3-4 Click on "Record type" dropdown and search for "Holdings", select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Holdings');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Holdings');

        // #5-6 Click on "Record type" dropdown and search for "Instances", select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Instances');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Instances');

        // #7-8 Click on "Record type" dropdown and search for "Items", select it
        Lists.openRecordTypeDropdownSearchOptionAndSelectIt('Items');
        Lists.verifySelectedOptionsInRecordTypeDropdown('Items');
      },
    );
  });
});
