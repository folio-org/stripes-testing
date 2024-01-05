import Permissions from '../../support/dictionary/permissions';
import Lists from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Filter lists', () => {
  const userData = {};
  const createdLists = [
    {
      name: `C411804-${getTestEntityValue('test_list')}-1`,
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Private',
    },
    {
      name: `C411804-${getTestEntityValue('test_list')}-2`,
      recordType: 'Loans',
      status: 'Inactive',
      visibility: 'Private',
    },
    {
      name: `C411805-${getTestEntityValue('test_list')}-1`,
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Shared',
    },
    {
      name: `C411805-${getTestEntityValue('test_list')}-2`,
      recordType: 'Loans',
      status: 'Inactive',
      visibility: 'Private',
    },
    {
      name: `C411806-${getTestEntityValue('test_list')}-1`,
      recordType: 'Users',
      status: 'Inactive',
      visibility: 'Private',
    },
    {
      name: `C411806-${getTestEntityValue('test_list')}-2`,
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Private',
    },
    {
      name: `C411806-${getTestEntityValue('test_list')}-3`,
      recordType: 'Items',
      status: 'Inactive',
      visibility: 'Private',
    },
  ];

  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
      userData.username = userProperties.username;
      userData.password = userProperties.password;
      userData.userId = userProperties.userId;

      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
    });

    createdLists.forEach((list) => {
      Lists.openNewListPane();
      Lists.setName(list.name);
      Lists.setDescription(list.name);
      Lists.selectRecordType(list.recordType);
      Lists.selectStatus(list.status);
      Lists.selectVisibility(list.visibility);
      Lists.saveList();
      Lists.verifyCalloutMessage(`List ${list.name} saved.`);
      Lists.closeListDetailsPane();
    });
  });

  after('Delete test data', () => {
    cy.getUserToken(userData.username, userData.password);
    createdLists.forEach((list) => {
      Lists.getViaApi().then((response) => {
        const filteredItem = response.body.content.find((item) => item.name === list.name);
        Lists.deleteViaApi(filteredItem.id);
      });
    });
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C411804 Filter section: Statuses (corsair) (TaaS)',
    { tags: ['criticalPath', 'corsair'] },
    () => {
      // #1 Click on "Lists" in app navigation bar
      // Opens "Lists" landing page.
      // #2 Click on "Status" accordion on the "Filter" pane
      // The accordion collapses
      // #3 Click on "Statuses" accordion again
      // - The "Status" accordion is expanded
      // - Displays 2 statuses:
      //    - Active
      //    - Inactive
      // Active status is selected by default.
      // Displays small "x" next to the "Status"
      //  ![](index.php?/attachments/get/e397822a-4f34-49f1-8251-c9916a469283)
      // #4 Click on "Active" status to uncheck it
      // - The status "Active" unchecks
      // - The button "X" disappears
      // - The button "Reset all" becomes active.
      // #5 Click on "Reset all"
      // - The button "Reset all" becomes inactive.
      // - The status "Active" is checked.
      // - Displays "x" button next to the "Status"
      // - Lists landing page updates based on the "Active" status.
    },
  );

  it(
    'C411805 Filter section: Visibility (corsair) (TaaS)',
    { tags: ['criticalPath', 'corsair'] },
    () => {
      // #1 Click on "Lists" in app navigation bar
      // Opens "Lists" landing page.
      // #2 Click on "Visibility" accordion on the "Filter" pane
      // The accordion collapses
      // #3 Click on "Visibility" accordion again
      // - The "Visibility" accordion is expanded
      // - The "Visibility" accordion consists of "Shared" and "Private" options with unchecked checkboxes
      // #4 Select all options by marking the checkboxes as active
      // - Appears "x" button next to the title "Visibility"
      // - "Reset all" button becomes active
      // - The result table is updated with all visibilities
      // #5 Click on "x"
      // - Resets Visibility filters
      // - The button "Reset all" becomes inactive
      // #6 Click on "Private" checkbox
      // - Appears "x" button next to the title "Visibility"
      // - "Reset all" button becomes active
      // - The lists table updates with "Private" Visibility
      // #7 Uncheck the "Private" visibility and click on "Shared" checkbox
      // - Appears "x" button next to the title "Visibility"
      // - "Reset all" button becomes active
      // - The lists table updates with "Shared" Visibility
    },
  );

  it(
    'C411806 Filter section: Record types (corsair) (TaaS)',
    { tags: ['criticalPath', 'corsair'] },
    () => {
      // #1 Click on "Lists" in app navigation bar
      // Opens "Lists" landing page.
      // #2 Click on "Record types" accordion on the 'Filter' pane
      // The accordion collapses
      // #3 Click on "Record types" accordion again
      // - The "Record types" accordion is expanded
      // - The "Record types" accordion consists of statuses with unchecked checkboxes
      // #4 Check the list of record types
      // Displays
      // - Items
      // - Loans
      // - Users
      // - Purchase order Lines
      // #5 Select all record types by marking the checkboxes as active
      // - Appears "x" button next to the title "Record types"
      // - "Reset all" button becomes active
      // - The lists table updates with all record types.
      // #6 Click on "x"
      // - Resets record types filters
      // - Clears the result list
      // #7 Click on "Loans" checkbox
      // - Appears "x" button next to the title "Record types"
      // - "Reset all" button becomes active
      // - The lists table updates with "Loans" record type
      // #8 Click on "Items" checkbox
      // - Appears "x" button next to the title "Record types"
      // - "Reset all" button becomes active
      // - The lists table updates with "Items" record type
      // #9 Click on "Users" checkbox
      // - Appears "x" button next to the title "Record types"
      // - "Reset all" button becomes active
      // - The lists table updates with "Users" record type
      // #10 Click on "Reset all"
      // - The checkboxes unchecked on the "Record types" section
      // - The "x" button disappears.
      // - The button "Reset all" becomes inactive.
      // - "Active" status is selected by default.
    },
  );
});
