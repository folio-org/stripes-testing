import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('View list', () => {
    const userData = {};
    const listData = {
      name: `AT_C411840_InactiveList_${getTestEntityValue('list')}`,
      description: `AT_C411840_InactiveList_${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: false,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiOrganizationsView.gui,
      ])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          Lists.buildQueryOnActiveUsers().then(({ query, fields }) => {
            Lists.createQueryViaApi(query).then((createdQuery) => {
              listData.queryId = createdQuery.queryId;
              listData.fqlQuery = createdQuery.fqlQuery;
              listData.fields = fields;

              Lists.createViaApi(listData).then((body) => {
                listData.id = body.id;
              });
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteViaApi(listData.id);
      Users.deleteViaApi(userData.userId);
    });

    it('C411840 Inactive lists (corsair)', { tags: ['extendedPath', 'corsair', 'C411840'] }, () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });

      // Step 1: Click on any of the inactive lists
      Lists.selectInactiveLists();
      Lists.verifyListIsPresent(listData.name);
      Lists.openList(listData.name);

      // Step 2: Check the structure of the lists details page
      Lists.verifyRecordsNumber('No');
      Lists.closeListDetailsPane();
      Lists.openList(listData.name);

      // Step 3: Click on "Actions" dropdown
      Lists.openActions();

      // Step 4: Check the buttons status
      Lists.verifyRefreshListButtonIsDisabled();
      Lists.verifyExportListVisibleColumnsButtonIsDisabled();
      Lists.verifyExportListButtonIsDisabled();
      Lists.verifyEditListButtonIsActive();
      Lists.verifyDuplicateListButtonIsActive();
      Lists.verifyDeleteListButtonIsActive();

      // Step 5: Click on "List information" dropdown
      Lists.clickOnListInformationAccordion();

      // Step 6: Click on "List information" dropdown again
      Lists.expandListInformationAccordion();
      Lists.verifyStatusLabel('Inactive');
      Lists.verifyRecordType(listData.recordType);

      // Step 7: Click on "Query: " dropdown - collapse it
      Lists.clickOnQueryAccordion();

      // Step 8: Click on "Query: x" dropdown again - expand it
      Lists.clickOnQueryAccordion();
      Lists.verifyQuery(listData.fqlQuery);
      Lists.verifyListsPaneIsEmpty();

      // Step 9: Click on "X" button
      Lists.closeListDetailsPane();
      Lists.verifyListIsPresent(listData.name);
    });
  });
});
