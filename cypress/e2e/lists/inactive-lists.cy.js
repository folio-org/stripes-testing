import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Inactive lists', () => {
    let userData = {};
    const listData = {
      name: `C411840-${getTestEntityValue('list')}-inactive`,
      description: `C411840-${getTestEntityValue('desc')}-inactive`,
      recordType: 'Users',
      fqlQuery: '{"users.id":{"$eq":"nonexistent-user-id"}}',
      isActive: false,
      isPrivate: true,
    };

    before('Create test data', () => {
      cy.getAdminToken();

      // Create user with limited permissions based on TestRail requirements
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.loansAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });

      // Create inactive list with zero records via API
      Lists.buildQueryOnActiveUsersWithZeroRecords().then((query) => {
        const inactiveList = {
          name: listData.name,
          description: listData.description,
          recordType: listData.recordType,
          fqlQuery: query.query.fqlQuery,
          isActive: listData.isActive,
          isPrivate: listData.isPrivate,
        };
        Lists.createViaApi(inactiveList);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listData.name);
      if (userData.userId) Users.deleteViaApi(userData.userId);
    });

    it(
      'C411840 Inactive lists functionality verification (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411840'] },
      () => {
        // Preconditions: Log into FOLIO as a user with required permissions
        // Landing page contains inactive lists
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // Ensure inactive lists are visible in the filter
        Lists.selectInactiveLists();

        // Step 1: Click on any of the inactive lists
        Lists.openList(listData.name);
        // Expected: Opens lists details page

        // Step 2: Check the structure of the lists details page
        Lists.verifyListDetailsPageStructure();
        // Expected: Displays the title, "X records found", X button, "Actions" dropdown,
        // "List information" accordion, "Query: ..." accordion

        // Step 3: Click on "Actions" dropdown
        Lists.openActions();
        Lists.verifyActionsDropdownOptions();
        // Expected: Displays Refresh list, Edit list, Duplicate list, Delete list,
        // Export list(CSV), Show columns options

        // Step 4: Check the buttons status
        Lists.verifyActionButtonsStatus();
        // Expected: Refresh list, Export buttons are inactive;
        // Edit list, Duplicate list, Delete list are active

        // Step 5: Click on "List information" dropdown
        Lists.clickOnListInformationAccordion();
        // Expected: The dropdown collapses

        // Step 6: Click on "List information" dropdown again
        Lists.clickOnListInformationAccordion();
        Lists.verifyListInformationAccordionContent();
        // Expected: The dropdown expands and contains required fields
        Lists.verifyListNameLabel(listData.name);
        Lists.verifyListDescriptionLabel(listData.description);
        Lists.verifyVisibilityLabel('Private');
        Lists.verifyStatusLabel('Inactive');
        Lists.verifySourceLabel('System');

        // Step 7: Click on "Query: " dropdown
        Lists.clickOnQueryAccordion();
        // Expected: The dropdown collapses

        // Step 8: Click on "Query: x" dropdown again
        Lists.clickOnQueryAccordion();
        Lists.verifyQueryAccordionContent();
        // Expected: The dropdown expands, displays "0 records found"
        // and "The list contains no items"

        // Step 9: Click on "X" button
        Lists.closeListDetailsPane();
        // Expected: The list details page closes and opens landing page
        Lists.waitLoading();
      },
    );
  });
});
