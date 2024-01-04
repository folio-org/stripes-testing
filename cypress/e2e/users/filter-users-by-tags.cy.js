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
    cy.createTempUser([
      Permissions.uiTagsPermissionAll.gui,
      Permissions.uiUsersView.gui,
      Permissions.uiUserEdit.gui,
    ]).then((userProperties) => {
      userData.username = userProperties.username;
      userData.password = userProperties.password;
      userData.userId = userProperties.userId;
    });
    cy.createTempUser().then((userProperties) => {
      existingUser.username = userProperties.username;
      existingUser.password = userProperties.password;
      existingUser.userId = userProperties.userId;
    });
  });

  after('Delete a user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(existingUser.userId);
  });

  it('C343214 Filter users by tags (volaris) (TaaS)', { tags: ['extendedPath', 'volaris'] }, () => {
    // 1
    cy.login(userData.username, userData.password);
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.waitLoading();
    UsersSearchPane.searchByKeywords(existingUser.userId);
    UsersCard.waitLoading();
    UsersCard.verifyTagsNumber('0');
    // 2
    UsersCard.openTagsPane();
    // 4
    UsersCard.addTag(newTag);
    UsersCard.verifyTagsNumber('1');
    // 5
    UsersSearchPane.resetAllFilters();
    UsersSearchResultsPane.verifySearchPaneIsEmpty();
    // 6
    UsersSearchPane.chooseTagOption(newTag);
    UsersSearchResultsPane.verifySearchPaneIsEmpty(false);
    UsersSearchResultsPane.verifyResultsListHasUserWithName(existingUser.username);
  });
});
