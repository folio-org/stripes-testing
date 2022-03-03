import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
// import Permissions from '../../../support/dictionary/permissions';

describe('Management of n fee/fine owners and service points', () => {
  let userId = '';
  beforeEach(() => {
    cy.createTempUser(['Settings (Users): Can create, edit and remove owners']).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(SettingsMenu.usersOwnersPath);
      UsersOwners.waitLoading();
    });
  });

  it('C6530 Create notice policy', { tags: [TestType.smoke] }, () => {
    
  });

  afterEach(() => {
    cy.deleteUser(userId);
  });
});
