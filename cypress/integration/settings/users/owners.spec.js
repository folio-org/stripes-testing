import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import Permissions from '../../../support/dictionary/permissions';

describe('Management of n fee/fine owners and service points', () => {
  const users = [];
  const addedServicePoints = [];
  const createRegularUser = () => cy.createTempUser([Permissions.uiUsersSettingsOwners.gui,
    Permissions.uiUsersEdituserservicepoints.gui]);

  it('C441 Verify that you can create/edit/delete associations between fee/fine owners and service points', { tags: [TestType.smoke] }, () => {
    createRegularUser().then(firstUserProperties => {
      users.push(firstUserProperties);
      cy.login(firstUserProperties.username, firstUserProperties.password, { path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });
      // clarify should be service points be shared between existing users
      UsersOwners.getUsedServicePoints().then(usedServicePoints => {
        addedServicePoints.push(UsersOwners.defaultServicePoints.filter(servicePoint => !usedServicePoints?.includes(servicePoint))[0]);
        UsersOwners.startNewLineAdding();
        UsersOwners.fill(users[0].username, addedServicePoints.at(-1));
        UsersOwners.save(users[0].username);
        UsersOwners.startNewLineAdding();
        UsersOwners.checkUsedServicePoints(addedServicePoints);
        createRegularUser().then(secondUserProperties => {
          users.push(secondUserProperties);
          cy.login(secondUserProperties.username, secondUserProperties.password, { path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });

          UsersOwners.startNewLineAdding();
          UsersOwners.checkUsedServicePoints(addedServicePoints);

          cy.login(firstUserProperties.username, firstUserProperties.password, { path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });
          UsersOwners.unselectExistingServicePoint(addedServicePoints.at(-1));

          cy.login(secondUserProperties.username, secondUserProperties.password, { path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });
          UsersOwners.startNewLineAdding();
          UsersOwners.checkFreeServicePointPresence(addedServicePoints.at(-1));
          UsersOwners.cancelAdding();
        });
      });
    });
  });

  afterEach(() => {
    addedServicePoints.forEach(addedServicePoint => {
      UsersOwners.delete(addedServicePoint);
    });
    users.forEach(user => cy.deleteUser(user.userId));
  });
});
