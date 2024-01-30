import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('Add new list', () => {
    const userData = {};
    const listData = {
      name: getTestEntityValue('test_list'),
      recordType: 'Loans',
      status: ['Active', 'Inactive'],
      visibility: ['Private', 'Shared'],
    };

    beforeEach('Create a user', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    afterEach('Delete a user', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.getViaApi().then((response) => {
        const filteredItem = response.body.content.find((item) => item.name === listData.name);
        Lists.deleteViaApi(filteredItem.id);
      });
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411704 Create new lists: Private list (corsair)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility[0]);
        Lists.selectStatus(listData.status[0]);
        Lists.saveList();
        cy.contains(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        cy.reload();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData.visibility[0], rowIndex);
        });
      },
    );

    it(
      'C411706 Create new lists: Shared lists (corsair)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility[1]);
        Lists.selectStatus(listData.status[0]);
        Lists.saveList();
        cy.contains(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        cy.reload();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData.visibility[1], rowIndex);
        });
      },
    );

    it(
      'C411707 Create new lists: Active lists (corsair)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility[0]);
        Lists.selectStatus(listData.status[0]);
        Lists.saveList();
        cy.contains(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        cy.reload();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData.status[0], rowIndex);
        });
      },
    );

    it(
      'C411708 Create new lists: Inactive lists (corsair)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility[0]);
        Lists.selectStatus(listData.status[1]);
        Lists.saveList();
        cy.contains(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        cy.reload();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData.status[1], rowIndex);
        });
      },
    );
  });
});
