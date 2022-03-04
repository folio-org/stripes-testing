import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
// import Permissions from '../../../support/dictionary/permissions';

describe('Management of n fee/fine owners and service points', () => {
  const users = [];
  beforeEach(() => {
    cy.createTempUser(['Settings (Users): Can create, edit and remove owners',
      'Users: Can assign and unassign service points to users']).then(firstUserProperties => {
      users.add({ userId:firstUserProperties.userId,
        userName: firstUserProperties.username });
      cy.login(firstUserProperties.userme, firstUserProperties.password);
      cy.visit(SettingsMenu.usersOwnersPath);
      UsersOwners.waitLoading();
    });

    it('C441  Only one Fee/Fine Owner is allowed to be associated to a Service Point', { tags: [TestType.smoke] }, () => {
      UsersOwners.addNewLine();
      UsersOwners.getUsedServicePoints().then(usedServicePoints => {
        const freeServicePoint = usedServicePoints.filter(servicePoint => !usedServicePoints.contains(servicePoint))[0];
        UsersOwners.fill(users[0].userName, UsersOwners.defaultServicePoints.filter(freeServicePoint));
        UsersOwners.save();
      });
      // cy.createTempUser(['Settings (Users): Can create, edit and remove owners',
      //   'Users: Can assign and unassign service points to users']).then(secondUserProperties => {
      //   userIds.add(secondUserProperties.userId);
      // });
    });
  });

  afterEach(() => {
    // cy.deleteUser(userId);
  });
});
