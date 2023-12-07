import Permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import Lists from '../../../support/fragments/lists/lists';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Cancel list creation process', () => {
  const userData = {};
  const listData = {
    name: getTestEntityValue('test_list'),
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
    'C411709    Verify that the button "Cancel", cancels new list creation process.',
    { tags: [TestTypes.criticalPath, DevTeams.corsair] },
    () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.cancelList();
      Lists.cancelListPopup();
      Lists.keepEditing();
      cy.url().should('include', '/new');
      Lists.cancelList();
      Lists.closeWithoutSaving();
      cy.url().should('include', '/lists');
    },
  );
});
