import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Add new list', () => {
    const firstUser = {};
    const secondUser = {};
    const listData = {
      name: getTestEntityValue('test_list'),
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Private',
    };

    before('Create a user', () => {
      cy.getAdminToken();
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

    after('Delete a user', () => {
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
      "C411710 Verify that private list isn't visible for the other users",
      { tags: ['smoke', 'corsair'] },
      () => {
        cy.login(firstUser.username, firstUser.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.saveList();
        cy.contains(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        cy.wait(3000);
        cy.login(secondUser.username, secondUser.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
        Lists.verifyListIsNotPresent(listData.name);
      },
    );
  });
});
