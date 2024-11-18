import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';

describe('Users', () => {
  const userData = {};
  const existingUser = {};
  const newTag = uuid();

  before('Create a user', () => {
    cy.getAdminToken();
    cy.createTempUser().then((userProperties) => {
      existingUser.username = userProperties.username;
      existingUser.password = userProperties.password;
      existingUser.userId = userProperties.userId;
    });
    cy.createTempUser([
      Permissions.uiTagsPermissionAll.gui,
      Permissions.uiUsersView.gui,
      Permissions.uiUserEdit.gui,
    ]).then((userProperties) => {
      userData.username = userProperties.username;
      userData.password = userProperties.password;
      userData.userId = userProperties.userId;
      cy.login(userData.username, userData.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Delete a user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(existingUser.userId);
  });

  it(
    'C343214 Filter users by tags (volaris) (TaaS)',
    { tags: ['criticalPath', 'volaris', 'C343214'] },
    () => {
      UsersSearchPane.searchByKeywords(existingUser.userId);
      UsersCard.waitLoading();
      UsersCard.verifyTagsNumber('0');

      UsersCard.openTagsPane();

      UsersCard.addTag(newTag);
      UsersCard.verifyTagsNumber('1');

      UsersSearchPane.resetAllFilters();
      UsersSearchResultsPane.verifySearchPaneIsEmpty();

      UsersSearchPane.chooseTagOption(newTag);
      UsersSearchResultsPane.verifySearchPaneIsEmpty(false);
      UsersSearchResultsPane.verifyResultsListHasUserWithName(existingUser.username);
    },
  );
});
