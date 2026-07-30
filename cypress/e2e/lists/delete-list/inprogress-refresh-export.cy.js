import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  usersFieldValues,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Delete list', () => {
    const userData = {};
    const testData = {};
    const listData = {
      name: getTestEntityValue('list_C411770'),
      recordType: 'Users',
      status: 'Active',
      visibility: 'Shared',
    };

    beforeEach('Create a user', () => {
      cy.getAdminToken();
      testData.emailPrefix = `AT_C411770_${getRandomPostfix()}`;
      testData.additionalUserIds = [];

      for (let i = 1; i <= 5; i++) {
        cy.createTempUser(
          [],
          'staff',
          'staff',
          true,
          `${testData.emailPrefix}_${i}@folio.org`,
        ).then((userProperties) => {
          testData.additionalUserIds.push(userProperties.userId);
        });
      }

      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    afterEach('Delete a user', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listData.name);
      testData.additionalUserIds.forEach((userId) => Users.deleteViaApi(userId));
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411770 Delete list: Refresh is in progress (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411770', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.buildQuery();
        QueryModal.selectField(usersFieldValues.userEmail);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
        QueryModal.fillInValueTextfield(testData.emailPrefix);
        QueryModal.testQuery();
        QueryModal.clickRunQueryAndSave();
        Lists.openActions();
        Lists.verifyDeleteListButtonIsDisabled();
        Lists.waitForCompilingToComplete(5000);
        Lists.closeListDetailsPane();
        cy.wait(5000); // wait for the list to appear on the landing page after refreshing
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );

    it(
      'C411771 Delete list: Export is in progress (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411771', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.buildQuery();
        QueryModal.selectField(usersFieldValues.userEmail);
        QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
        QueryModal.fillInValueTextfield(testData.emailPrefix);
        QueryModal.testQuery();
        QueryModal.clickRunQueryAndSave();
        Lists.waitForCompilingToComplete(7000);
        Lists.openActions();
        Lists.exportList();
        Lists.openActions();
        Lists.verifyDeleteListButtonIsDisabled();
        Lists.closeListDetailsPane();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );
  });
});
