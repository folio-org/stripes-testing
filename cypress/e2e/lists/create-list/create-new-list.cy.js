import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Add new list', () => {
    const userData = {};
    let listData = {};

    beforeEach('Create a user', () => {
      listData = {
        name: getTestEntityValue('list'),
        recordType: 'Loans',
      };
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.ordersStorageAcquisitionMethodsCollectionGet.gui,
      ]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    afterEach('Delete a user', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteListByNameViaApi(listData.name);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411704 Create new lists: Private list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411704', 'shiftLeft', 'eurekaPhase1'] },
      () => {
        listData.status = 'Active';
        listData.visibility = 'Private';

        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );

    it(
      'C411706 C414979 Create new lists: Shared lists (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411706', 'C414979', 'eurekaPhase1'] },
      () => {
        listData.status = 'Active';
        listData.visibility = 'Shared';

        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes([
          'Items',
          'Loans',
          'Users',
          'Instances',
          'Holdings',
          'Organizations',
          // 'Purchase Order lines',
          // 'Budgets',
          // 'Fund with ledger',
          // 'Invoice lines',
          // 'Invoices',
          // 'Purchase order lines with titles',
          // 'Purchase orders',
          // 'Transactions',
          // 'Voucher lines with fund',
          // 'Voucher lines with invoice, fund, organization',
          // 'Vouchers',
        ]);

        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );

    it(
      'C411707 Create new lists: Active lists (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411707', 'eurekaPhase1'] },
      () => {
        listData.status = 'Active';
        listData.visibility = 'Shared';

        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );

    it(
      'C411708 Create new lists: Inactive lists (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411708', 'eurekaPhase1'] },
      () => {
        listData.status = 'Inactive';
        listData.visibility = 'Shared';

        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        Lists.waitLoading();
        Lists.selectInactiveLists();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );
  });
});
