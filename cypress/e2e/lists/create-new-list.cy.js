import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Lists from '../../support/fragments/lists/lists';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Create a new list', () => {
  const userData = {};
  const listData = {
    name: getTestEntityValue('test_list'),
    recordType: 'Loans',
    status: 'Active',
    visibility: 'Private',
  };

  before('Create a user', () => {
    cy.getAdminToken();
    cy.createTempUser([Permissions.listsAll.gui])
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      })
      .then(() => {
        cy.login(userData.username, userData.password);
        cy.visit(TopMenu.listsPath);
        Lists.waitLoading();
      });
  });

  after('Delete a user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    Lists.getViaApi().then((response) => {
      const filteredItem = response.body.content.find((item) => item.name === listData.name);
      Lists.deleteViaApi(filteredItem.id);
    });
  });

  it(
    'C411704 Create new lists: Private list (corsair)',
    { tags: ['criticalPath', 'corsair'] },
    () => {
      cy.loginAsAdmin();
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.openNewListPane();
      Lists.setName(listData.name);
      Lists.setDescription(listData.name);
      Lists.selectRecordType(listData.recordType);
      Lists.selectVisibility(listData.visibility);
      Lists.saveList();
      Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);

      Lists.closeListDetailsPane();
      Lists.verifySuccessCalloutMessage(
        `${listData.name} was created. Refresh to see changes. Note that list may not appear if filters are applied.`,
      );
      cy.reload();
      Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
        cy.log(rowIndex);
        Lists.checkResultSearch(listData, rowIndex);
      });
    },
  );
});
