import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Edit list', () => {
    const firstUser = {};
    const secondUser = {};
    const listData = {
      name: getTestEntityValue('test_list'),
      recordType: 'Loans',
      status: 'Active',
      visibility: ['Private', 'Shared'],
    };

    beforeEach('Create a user', () => {
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        firstUser.username = userProperties.username;
        firstUser.password = userProperties.password;
        firstUser.userId = userProperties.userId;
      });
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        secondUser.username = userProperties.username;
        secondUser.password = userProperties.password;
        secondUser.userId = userProperties.userId;
      });
    });

    afterEach('Delete a user', () => {
      cy.getUserToken(firstUser.username, firstUser.password);
      Lists.getViaApi().then((response) => {
        const filteredItem = response.body.content.find((item) => item.name === listData.name);
        Lists.deleteViaApi(filteredItem.id);
      });
      cy.getAdminToken();
      Users.deleteViaApi(firstUser.userId);
      Users.deleteViaApi(secondUser.userId);
    });

    it(
      'C411733 Edit list: Make the list Private (corsair)',
      { tags: ['smoke', 'corsair', 'eurekaPhase1'] },
      () => {
        cy.login(firstUser.username, firstUser.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility[1]);
        Lists.saveList();
        cy.contains(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        cy.wait(3000);
        cy.login(secondUser.username, secondUser.password); // User B logs in to make sure that 'Shared' list is visible
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        cy.contains(listData.name).should('be.visible');
        cy.wait(2000);
        cy.login(firstUser.username, firstUser.password); // User A logs in to make the list 'Private'
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        cy.contains(listData.name).click();
        Lists.actionButton();
        Lists.editList();
        Lists.selectVisibility('Private');
        Lists.saveList();
        Lists.closeListDetailsPane();
        cy.wait(3000);
        cy.login(secondUser.username, secondUser.password); // User B logs in to make sure that 'Private' list is not visible
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.verifyListIsNotPresent(listData.name);
      },
    );

    it(
      'C411736 Edit list: Make the list Shared (corsair)',
      { tags: ['smoke', 'corsair', 'eurekaPhase1'] },
      () => {
        cy.login(firstUser.username, firstUser.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility[0]);
        Lists.saveList();
        cy.contains(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        cy.wait(3000);
        cy.login(secondUser.username, secondUser.password); // User B logs in to make sure that 'Shared' list is not visible
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.verifyListIsNotPresent(listData.name);
        cy.wait(2000);
        cy.login(firstUser.username, firstUser.password); // User A logs in to make the list 'Shared'
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        cy.contains(listData.name).click();
        Lists.actionButton();
        Lists.editList();
        Lists.selectVisibility('Shared');
        Lists.saveList();
        Lists.closeListDetailsPane();
        cy.wait(3000);
        cy.login(secondUser.username, secondUser.password); // User B logs in to make sure that 'Shared' list is visible
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        cy.contains(listData.name).should('be.visible');
      },
    );
  });
});
