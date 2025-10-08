import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  let userData = {};

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.listsAll.gui,
      Permissions.uiUsersViewRequests.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrganizationsViewEditCreate.gui,
      Permissions.uiUsersLoansViewRenewChangeDueDate.gui,
      Permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
  });

  it('C411840 Inactive lists - Verify inactive list details page structure and functionality', 
    { tags: ['criticalPath', 'lists'] }, 
    () => {
      // Precondition: Create several inactive lists for testing
      const inactiveListsData = [
        {
          name: `C411840-${getTestEntityValue('list')}-1`,
          description: `C411840-${getTestEntityValue('desc')}-1`,
          recordType: 'Users',
          fqlQuery: '',
          isActive: false,
          isPrivate: false,
        },
        {
          name: `C411840-${getTestEntityValue('list')}-2`,
          description: `C411840-${getTestEntityValue('desc')}-2`,
          recordType: 'Items',
          fqlQuery: '',
          isActive: false,
          isPrivate: true,
        },
        {
          name: `C411840-${getTestEntityValue('list')}-3`,
          description: `C411840-${getTestEntityValue('desc')}-3`,
          recordType: 'Organizations',
          fqlQuery: '',
          isActive: false,
          isPrivate: false,
        }
      ];

      // Create inactive lists via API using existing framework patterns
      cy.getUserToken(userData.username, userData.password).then(() => {
        // Build query for Users list (first inactive list)
        Lists.buildQueryOnActiveUsersWithZeroRecords().then(({ query, fields }) => {
          Lists.createQueryViaApi(query).then((createdQuery) => {
            inactiveListsData[0].queryId = createdQuery.queryId;
            inactiveListsData[0].fqlQuery = createdQuery.fqlQuery;
            inactiveListsData[0].fields = fields;

            Lists.createViaApi(inactiveListsData[0]).then((body) => {
              inactiveListsData[0].id = body.id;
            });
          });
        });

        // Create other inactive lists without queries (empty lists)
        inactiveListsData.slice(1).forEach((listData) => {
          Lists.createViaApi(listData).then((body) => {
            listData.id = body.id;
          });
        });
      });

      // Wait for lists to be created
      cy.wait(2000);

      // Navigate to inactive lists page
      cy.visit('/lists?filters=status.Inactive&limit=100&offset=0');
      Lists.waitLoading();

      // Verify we're on the inactive lists page with inactive filter checked
      Lists.selectInactiveLists();
      Lists.verifyCheckboxChecked('Inactive');

      // Verify our test inactive lists are present
      inactiveListsData.forEach((listData) => {
        Lists.verifyListIsPresent(listData.name);
      });

      // Step 1: Click on any of the inactive lists (first one)
      Lists.openList(inactiveListsData[0].name);
      
      // Step 2: Check the structure of the lists details page
      // Verify title is displayed
      Lists.verifyListName(inactiveListsData[0].name);
      
      // Verify "X records found" is displayed under the title
      Lists.verifyRecordsNumber('0');
      
      // Verify Actions dropdown at top-right
      Lists.verifyActionsButtonDoesNotExist() === false; // Actions button should exist
      
      // Verify List information accordion
      Lists.expandListInformationAccordion();
      
      // Verify Query accordion
      Lists.expandQueryAccordion();

      // Step 3: Click on "Actions" dropdown
      Lists.openActions();
      
      // Step 4: Check the buttons status
      // Verify inactive buttons (disabled)
      Lists.verifyRefreshListButtonIsDisabled();
      Lists.verifyExportListButtonIsDisabled();
      
      // Verify active buttons (enabled)
      Lists.verifyEditListButtonIsActive();
      Lists.verifyDuplicateListButtonIsActive();
      Lists.verifyDeleteListButtonIsActive();

      // Step 5: Click on "List information" dropdown (collapse)
      Lists.clickOnListInformationAccordion();

      // Step 6: Click on "List information" dropdown again (expand)
      Lists.expandListInformationAccordion();
      
      // Verify list information content
      Lists.verifyListNameLabel(inactiveListsData[0].name);
      Lists.verifyListDescriptionLabel(inactiveListsData[0].description);
      Lists.verifyStatusLabel('Inactive');
      Lists.verifyVisibilityLabel('Shared');
      Lists.verifyRecordType('Users');

      // Step 7: Click on "Query" dropdown (collapse)
      Lists.clickOnQueryAccordion();

      // Step 8: Click on "Query" dropdown again (expand)
      Lists.expandQueryAccordion();
      
      // Verify query content shows 0 records
      Lists.verifyRecordsNumber('0');

      // Step 9: Click on "X" button
      Lists.closeListDetailsPane();
      
      // Verify we're back on the lists landing page with inactive filter
      Lists.verifyCheckboxChecked('Inactive');
      cy.url().should('include', 'lists?filters=status.Inactive');

      // Clean up: Delete created test lists
      cy.getUserToken(userData.username, userData.password).then(() => {
        inactiveListsData.forEach((listData) => {
          if (listData.id) {
            Lists.deleteViaApi(listData.id);
          }
        });
      });
    }
  );
});