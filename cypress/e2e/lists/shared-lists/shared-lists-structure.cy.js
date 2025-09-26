import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Shared lists', () => {
    const userData = {};
    
    // List with query and records > 2
    const listWithRecordsData = {
      name: `C411841-${getTestEntityValue('list-with-records')}`,
      description: `C411841-${getTestEntityValue('desc-with-records')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    // List with query but 0 records
    const listWithZeroRecordsData = {
      name: `C411841-${getTestEntityValue('list-zero-records')}`,
      description: `C411841-${getTestEntityValue('desc-zero-records')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    // List without query
    const listWithoutQueryData = {
      name: `C411841-${getTestEntityValue('list-no-query')}`,
      description: `C411841-${getTestEntityValue('desc-no-query')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      
      // Create user with required permissions
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.ordersAll.gui,
        Permissions.organizationsAll.gui,
        Permissions.usersViewLoans.gui,
        Permissions.inventoryAll.gui,
      ])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          // Create list with active users (should have records)
          Lists.buildQueryOnActiveUsers().then(({ query, fields }) => {
            Lists.createQueryViaApi(query).then((createdQuery) => {
              listWithRecordsData.queryId = createdQuery.queryId;
              listWithRecordsData.fqlQuery = createdQuery.fqlQuery;
              listWithRecordsData.fields = fields;

              Lists.createViaApi(listWithRecordsData).then((body) => {
                listWithRecordsData.id = body.id;
              });
            });
          });

          // Create list with query that returns 0 records
          Lists.buildQueryOnActiveUsersWithZeroRecords().then(({ query, fields }) => {
            Lists.createQueryViaApi(query).then((createdQuery) => {
              listWithZeroRecordsData.queryId = createdQuery.queryId;
              listWithZeroRecordsData.fqlQuery = createdQuery.fqlQuery;
              listWithZeroRecordsData.fields = fields;

              Lists.createViaApi(listWithZeroRecordsData).then((body) => {
                listWithZeroRecordsData.id = body.id;
              });
            });
          });

          // Create list without query (just basic list)
          Lists.createViaApi(listWithoutQueryData).then((body) => {
            listWithoutQueryData.id = body.id;
          });
        });
    });

    after('Delete test data', () => {
      Lists.resetAllFilters();
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteViaApi(listWithRecordsData.id);
      Lists.deleteViaApi(listWithZeroRecordsData.id);
      Lists.deleteViaApi(listWithoutQueryData.id);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411841 Shared lists (corsair)',
      { tags: ['extendedPath', 'corsair', 'C411841'] },
      () => {
        // Preconditions: Log into FOLIO as a user with permissions
        // Landing page contains shared list (not canned)
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.resetAllFilters();

        // Step 1: Click on active list with more than 2 records
        Lists.verifyListIsPresent(listWithRecordsData.name);
        Lists.openList(listWithRecordsData.name);
        // Expected: Opens lists details page

        // Step 2: Check the structure of the lists details page
        Lists.verifyListDetailsPageStructure();
        // Expected: Displays the title, "X records found", x button, "Actions" dropdown,
        // "List information" accordion, "Query: ..." accordion

        // Step 3: Click on "Actions" dropdown
        Lists.openActions();
        Lists.verifyActionsDropdownOptions();
        // Expected: Displays Refresh list, Edit list, Duplicate list, Delete list,
        // Export selected columns (CSV), Export all columns (CSV), Show columns

        // Step 4: Check the buttons status
        Lists.verifyActionButtonsStatus();
        // Expected: All buttons are active

        // Step 5: Click on "List information" dropdown
        Lists.expandListInformationAccordion();
        Lists.verifyListInformationAccordionContent();
        // Expected: The dropdown expands and contains required fields

        // Step 6: Click on "x"
        Lists.closeListDetailsPane();
        // Expected: The list details page closes, The user is on the landing page
        Lists.waitLoading();

        // Step 7: Click on active list with a query but with 0 records
        Lists.verifyListIsPresent(listWithZeroRecordsData.name);
        Lists.openList(listWithZeroRecordsData.name);
        // Expected: Opens lists details page

        // Step 8: Check the structure of the lists details page
        Lists.verifyListDetailsPageStructure();
        Lists.verifyRecordsNumber('0');
        // Expected: Displays the title, "0 records found", x button, "Actions" dropdown,
        // "List information" accordion, "Query: ..." accordion

        // Step 9: Click on "Actions" dropdown
        Lists.openActions();
        Lists.verifyActionsDropdownOptions();
        // Expected: Displays the same action options

        // Step 10: Check the buttons status
        Lists.verifyActionButtonsStatusForEmptyList();
        // Expected: Refresh list, Edit list, Duplicate list, Delete list are active.
        // Export selected columns (CSV) and Export all columns (CSV) are inactive

        // Step 11: Click on "List information" dropdown
        Lists.expandListInformationAccordion();
        Lists.verifyListInformationAccordionContent();
        // Expected: The dropdown expands and contains required fields

        // Step 12: Click on "x"
        Lists.closeListDetailsPane();
        // Expected: The list details page closes, The user is on the landing page
        Lists.waitLoading();

        // Step 13: Click on active list without query
        Lists.verifyListIsPresent(listWithoutQueryData.name);
        Lists.openList(listWithoutQueryData.name);
        // Expected: Opens lists details page

        // Step 14: Check the structure of the lists details page
        Lists.verifyListDetailsPageStructure();
        Lists.verifyRecordsNumber('0');
        // Expected: Displays the title, "0 records found", x button, "Actions" dropdown,
        // "List information" accordion, "Query:" accordion

        // Step 15: Click on "Actions" dropdown
        Lists.openActions();
        Lists.verifyActionsDropdownOptions();
        // Expected: Displays the same action options

        // Step 16: Check the buttons status
        Lists.verifyActionButtonsStatusForListWithoutQuery();
        // Expected: Refresh list, Export visible columns (CSV), and Export all columns (CSV) are inactive
        // Edit list, Duplicate list and Delete list are active

        // Step 17: Check the "List information" dropdown
        Lists.expandListInformationAccordion();
        Lists.verifyListInformationAccordionContent();
        // Expected: The dropdown expands and contains required fields

        // Step 18: Check the "Query:" section
        Lists.expandQueryAccordion();
        Lists.verifyQueryAccordionContent();
        // Expected: Query accordion shows appropriate content

        // Step 19: Click on "X"
        Lists.closeListDetailsPane();
        // Expected: The list details page closes, The user is on the landing page
        Lists.waitLoading();
      },
    );
  });
});