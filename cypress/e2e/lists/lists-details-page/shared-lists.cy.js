import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists details page', () => {
    let userData = {};
    const listWithRecordsData = {
      name: `AT_C411841_WithRecords_${getTestEntityValue('list')}`,
      description: `AT_C411841_WithRecords_${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const listWithZeroRecordsData = {
      name: `AT_C411841_ZeroRecords_${getTestEntityValue('list')}`,
      description: `AT_C411841_ZeroRecords_${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    const listWithoutQueryData = {
      name: `AT_C411841_NoQuery_${getTestEntityValue('list')}`,
      description: `AT_C411841_NoQuery_${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.getAdminToken();
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

      Lists.buildQueryOnActiveUsers().then(({ query, fields }) => {
        Lists.createQueryViaApi(query).then((createdQuery) => {
          listWithRecordsData.queryId = createdQuery.queryId;
          listWithRecordsData.fqlQuery = createdQuery.fqlQuery;
          listWithRecordsData.fields = fields;
          Lists.createViaApi(listWithRecordsData).then((body) => {
            listWithRecordsData.id = body.id;
            Lists.refreshViaApi(body.id);
            Lists.waitForListToCompleteRefreshViaApi(body.id);
            Lists.getListByIdViaApi(body.id).then((list) => {
              listWithRecordsData.recordsCount = list.successRefresh.recordsCount;
            });
          });
        });
      });

      Lists.buildQueryOnActiveUsersWithZeroRecords().then(({ query, fields }) => {
        Lists.createQueryViaApi(query).then((createdQuery) => {
          listWithZeroRecordsData.queryId = createdQuery.queryId;
          listWithZeroRecordsData.fqlQuery = createdQuery.fqlQuery;
          listWithZeroRecordsData.fields = fields;
          Lists.createViaApi(listWithZeroRecordsData).then((body) => {
            listWithZeroRecordsData.id = body.id;
            Lists.refreshViaApi(body.id);
            Lists.waitForListToCompleteRefreshViaApi(body.id);
          });
        });
      });

      Lists.createViaApi(listWithoutQueryData).then((body) => {
        listWithoutQueryData.id = body.id;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteViaApi(listWithRecordsData.id);
      Lists.deleteViaApi(listWithZeroRecordsData.id);
      Lists.deleteViaApi(listWithoutQueryData.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411841 Shared lists (corsair)',
      { tags: ['extendedPath', 'corsair', 'C411841'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // Scenario 1: Active list with more than 2 records
        Lists.openList(listWithRecordsData.name);
        Lists.verifyRecordsNumber(listWithRecordsData.recordsCount);
        Lists.openActions();
        Lists.verifyRefreshListButtonIsActive();
        Lists.verifyEditListButtonIsActive();
        Lists.verifyDuplicateListButtonIsActive();
        Lists.verifyDeleteListButtonIsActive();
        Lists.verifyExportListVisibleColumnsButtonIsActive();
        Lists.verifyExportListButtonIsActive();
        Lists.expandListInformationAccordion();
        Lists.verifyListNameLabel(listWithRecordsData.name);
        Lists.verifyListDescriptionLabel(listWithRecordsData.description);
        Lists.verifyVisibilityLabel('Shared');
        Lists.verifyStatusLabel('Active');
        Lists.closeListDetailsPane();

        cy.wait(3000); // to avoid issues with opening the list details pane in the next step

        // Scenario 2: Active list with query but 0 records
        Lists.openList(listWithZeroRecordsData.name);
        Lists.verifyRecordsNumber('No');
        Lists.openActions();
        Lists.verifyRefreshListButtonIsActive();
        Lists.verifyEditListButtonIsActive();
        Lists.verifyDuplicateListButtonIsActive();
        Lists.verifyDeleteListButtonIsActive();
        Lists.verifyExportListVisibleColumnsButtonIsDisabled();
        Lists.verifyExportListButtonIsDisabled();
        Lists.expandListInformationAccordion();
        Lists.verifyListNameLabel(listWithZeroRecordsData.name);
        Lists.verifyListDescriptionLabel(listWithZeroRecordsData.description);
        Lists.verifyVisibilityLabel('Shared');
        Lists.verifyStatusLabel('Active');
        Lists.closeListDetailsPane();

        cy.wait(3000); // to avoid issues with opening the list details pane in the next step

        // Scenario 3: Active list without query
        Lists.openList(listWithoutQueryData.name);
        Lists.verifyRecordsNumber('No');
        Lists.openActions();
        Lists.verifyRefreshListButtonIsDisabled();
        Lists.verifyEditListButtonIsActive();
        Lists.verifyDuplicateListButtonIsActive();
        Lists.verifyDeleteListButtonIsActive();
        Lists.verifyExportListVisibleColumnsButtonIsDisabled();
        Lists.verifyExportListButtonIsDisabled();
        Lists.expandListInformationAccordion();
        Lists.verifyListNameLabel(listWithoutQueryData.name);
        Lists.verifyListDescriptionLabel(listWithoutQueryData.description);
        Lists.verifyVisibilityLabel('Shared');
        Lists.verifyStatusLabel('Active');
        Lists.clickOnQueryAccordion();
        Lists.closeListDetailsPane();
      },
    );
  });
});
