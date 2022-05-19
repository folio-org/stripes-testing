import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import Permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import Features from '../../../support/dictionary/features';

describe('ui-users-settings: Owners', () => {
  describe('Owner creation', () => {
    const servicePoints = [];
    const ownerName = `Automation owner $${getRandomPostfix()}`;

    beforeEach(() => {
      cy.loginAsAdmin({ path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });
      cy.getAdminToken().then(() => {
        cy.createServicePoint()
          .then(newServicePoint => {
            servicePoints.push(newServicePoint);
          });
        cy.createServicePoint()
          .then(newServicePoint => {
            servicePoints.push(newServicePoint);
          });
      });
    });

    // afterEach(() => {
    //   servicePoints.forEach(servicePoint => {
    //     cy.deleteServicePoint(servicePoint.id);
    //   });
    // });

    it('C350616 Fee/Fine Owners are not required to have a Service Point', { tags: [TestType.smoke] }, () => {
      UsersOwners.startNewLineAdding();
      UsersOwners.fill(ownerName);
      UsersOwners.save(ownerName);

      UsersOwners.startNewLineAdding();
      UsersOwners.multiCheckFreeServicePointPresence(servicePoints);

      // testdata clearing
      UsersOwners.getOwnerViaApi({ query: `owner==${ownerName}` })
        .then(owner => UsersOwners.deleteViaApi(owner.id));
    });

    it.only('C350615 The "Shared" Fee/Fine Owner is not allowed to have Service Points', { tags: [TestType.smoke, Features.sharedOwner] }, () => {
      UsersOwners.startNewLineAdding();
      UsersOwners.fill('Shared', servicePoints.at(-1).name);
      UsersOwners.trySave();

      UsersOwners.checkValidatorError('Shared', 'Associated service points not allowed for Shared fee/fine owner');
    });
  });

  describe('Management of n fee/fine owners and service points', () => {
    const users = [];
    const addedServicePoints = [];
    const createRegularUser = () => cy.createTempUser([Permissions.uiUsersSettingsOwners.gui,
      Permissions.uiUsersEdituserservicepoints.gui]);

    it('C441 Verify that you can create/edit/delete associations between fee/fine owners and service points', { tags: [TestType.criticalPath] }, () => {
      createRegularUser().then(firstUserProperties => {
        users.push(firstUserProperties);

        cy.allure().startStep('Login and open Owners settings by user1');
        cy.login(firstUserProperties.username, firstUserProperties.password, { path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });
        cy.allure().endStep();

        // clarify should be service points be shared between existing users
        cy.allure().startStep('Check presented owners and related service points');
        UsersOwners.getUsedServicePoints().then(usedServicePoints => {
          addedServicePoints.push(UsersOwners.defaultServicePoints.filter(servicePoint => !usedServicePoints?.includes(servicePoint))[0]);
          cy.allure().endStep();

          cy.allure().startStep('Add new owner, related with current user and not used service point');
          UsersOwners.startNewLineAdding();
          UsersOwners.fill(users[0].username, addedServicePoints.at(-1));
          UsersOwners.save(users[0].username);
          cy.allure().endStep();

          cy.allure().startStep('Verify values in Associated service points.');
          UsersOwners.startNewLineAdding();
          UsersOwners.checkUsedServicePoints(addedServicePoints);
          cy.allure().endStep();

          createRegularUser().then(secondUserProperties => {
            users.push(secondUserProperties);

            cy.allure().startStep('Login and open Owners settings by user2');
            cy.login(secondUserProperties.username, secondUserProperties.password, { path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });
            cy.allure().endStep();

            cy.allure().startStep('Verify values in Associated service points. It should not contain service point from previous step');
            UsersOwners.startNewLineAdding();
            UsersOwners.checkUsedServicePoints(addedServicePoints);
            cy.allure().endStep();

            cy.allure().startStep('Login and open Owners settings by user1');
            cy.login(firstUserProperties.username, firstUserProperties.password, { path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });
            cy.allure().endStep();

            // TODO:  can be not stable, review in the future
            cy.allure().startStep('Edit last created owner, uncheck already selected service point and save changed owner  ');
            UsersOwners.unselectExistingServicePoint(addedServicePoints.at(-1));
            cy.allure().endStep();

            cy.allure().startStep('Login and open Owners settings by user2');
            cy.login(secondUserProperties.username, secondUserProperties.password, { path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });
            cy.allure().endStep();

            cy.allure().startStep('Verify values in Associated service points. It should contain service point from previous step');
            UsersOwners.startNewLineAdding();
            UsersOwners.checkFreeServicePointPresence(addedServicePoints.at(-1));
            cy.allure().endStep();
            UsersOwners.cancelAdding();
            // clearing of test data collector from outdated information
            addedServicePoints.pop();
            UsersOwners.deleteOwner();
          });
        });
      });
    });

    afterEach(() => {
      users.forEach(user => cy.deleteUser(user.userId));
    });
  });
});
