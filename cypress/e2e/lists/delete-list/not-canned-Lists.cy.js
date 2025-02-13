import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Delete list', () => {
    const userData = {};
    const listData = {
      name: getTestEntityValue('test_list'),
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Shared',
    };

    before('Create a user', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });
    it(
      'C411768 Delete list: Positive case (corsair)',
      { tags: ['smoke', 'corsair', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.saveList();
        Lists.actionButton();
        cy.contains('Delete list').click();
        Lists.DeleteListModal();
        cy.contains(`List ${listData.name} deleted.`);
      },
    );

    it(
      'C411772 Delete list: "Edit list" mode (corsair)',
      { tags: ['criticalPath', 'corsair', 'eurekaPhase1'] },
      () => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.saveList();
        Lists.actionButton();
        cy.contains('Edit list').click();
        Lists.actionButton();
        cy.contains('Delete list').click();
        Lists.DeleteListModal();
        cy.contains(`List ${listData.name} deleted.`);
      },
    );
  });
});
