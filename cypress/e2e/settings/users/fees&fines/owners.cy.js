import Permissions from '../../../../support/dictionary/permissions';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Settings Users (Fee/fine)', () => {
    const servicePoints = [];
    const ownerNames = [];

    beforeEach(() => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(ServicePoints.getDefaultServicePointWithPickUpLocation()).then(
          (response) => {
            servicePoints.push(response.body);
          },
        );
        ServicePoints.createViaApi(ServicePoints.getDefaultServicePointWithPickUpLocation()).then(
          (response) => {
            servicePoints.push(response.body);
          },
        );

        cy.loginAsAdmin({ path: SettingsMenu.usersOwnersPath, waiter: UsersOwners.waitLoading });
      });
    });

    after(() => {
      cy.getAdminToken();
      servicePoints.forEach((servicePointId) => {
        ServicePoints.deleteViaApi(servicePointId.id);
      });

      ownerNames.forEach((ownerName) => {
        UsersOwners.getOwnerViaApi({ query: `owner==${ownerName}` }).then((owner) => {
          if (owner?.id) {
            UsersOwners.deleteViaApi(owner.id);
          }
        });
      });
    });

    it.skip(
      'C350616 Fee/Fine Owners are not required to have a Service Point (volaris)',
      { tags: ['smokeObsolete', 'volaris', 'shiftLeftObsolete', 'C350616', 'eurekaPhase1'] },
      () => {
        const name = `Automation owner $${getRandomPostfix()}`;
        ownerNames.push(name);
        UsersOwners.startNewLineAdding();
        UsersOwners.fillOwner({ name });
        UsersOwners.saveOwner(name);

        UsersOwners.startNewLineAdding();
        UsersOwners.multiCheckFreeServicePointPresence(servicePoints);
      },
    );

    it(
      'C350615 The "Shared" Fee/Fine Owner is not allowed to have Service Points (volaris)',
      { tags: ['smoke', 'volaris', 'shiftLeft', 'C350615', 'eurekaPhase1'] },
      () => {
        const name = 'Shared';
        UsersOwners.startNewLineAdding();
        UsersOwners.fillOwner({ name });
        UsersOwners.saveOwner();
        ownerNames.push(name);

        UsersOwners.startNewLineAdding();
        UsersOwners.fillOwner({ name, servicePoint: servicePoints.at(-1).name });
        UsersOwners.trySave();

        UsersOwners.checkValidatorError({
          error: 'Associated service points not allowed for Shared fee/fine owner',
        });
      },
    );
  });

  describe('Management of fee/fine owners', () => {
    before(() => {
      cy.loginAsAdmin({
        path: SettingsMenu.usersOwnersPath,
        waiter: UsersOwners.waitLoading,
      });
    });

    it(
      'C440 Verify that you can create/edit/delete fee/fine owners (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C440'] },
      () => {
        UsersOwners.startNewLineAdding();
        UsersOwners.trySave();

        UsersOwners.checkValidatorError({ error: 'Please fill this in to continue' });
        UsersOwners.cancelAdding();

        const name = `Automation owner $${getRandomPostfix()}`;
        const description = `Automation owner description $${getRandomPostfix()}`;

        UsersOwners.startNewLineAdding();
        UsersOwners.fillOwner({ name, description });
        UsersOwners.saveOwner(name);

        UsersOwners.startNewLineAdding();
        UsersOwners.fillOwner({ name, description });
        UsersOwners.trySave();

        UsersOwners.checkValidatorError({ error: 'Fee/fine owner already exists' });
        UsersOwners.cancelAdding();

        UsersOwners.editOwner(name, {
          name: `${name} to be deleted`,
          description: `${description} to be deleted`,
        });
        UsersOwners.deleteOwner(`${name} to be deleted`);
      },
    );
  });

  describe('Management of n fee/fine owners and service points', () => {
    const testUsers = [];
    const addedServicePoints = [];
    const createRegularUser = () => cy.createTempUser([
      Permissions.uiUsersSettingsOwners.gui,
      Permissions.uiUsersEdituserservicepoints.gui,
    ]);

    it(
      'C441 Verify that you can create/edit/delete associations between fee/fine owners and service points (vega)',
      { tags: ['criticalPath', 'vega', 'C441'] },
      () => {
        createRegularUser().then((firstUserProperties) => {
          testUsers.push(firstUserProperties);

          cy.login(firstUserProperties.username, firstUserProperties.password, {
            path: SettingsMenu.usersOwnersPath,
            waiter: UsersOwners.waitLoading,
          });

          // clarify should be service points be shared between existing users
          UsersOwners.getUsedServicePoints().then((usedServicePoints) => {
            addedServicePoints.push(
              ServicePoints.defaultServicePoints.filter(
                (servicePoint) => !usedServicePoints?.includes(servicePoint),
              )[0],
            );

            UsersOwners.startNewLineAdding();
            UsersOwners.fillOwner({
              name: testUsers[0].username,
              servicePoint: addedServicePoints.at(-1),
            });
            UsersOwners.saveOwner(testUsers[0].username);

            UsersOwners.startNewLineAdding();
            UsersOwners.checkUsedServicePoints(addedServicePoints);

            createRegularUser().then((secondUserProperties) => {
              testUsers.push(secondUserProperties);

              cy.login(secondUserProperties.username, secondUserProperties.password, {
                path: SettingsMenu.usersOwnersPath,
                waiter: UsersOwners.waitLoading,
              });

              UsersOwners.startNewLineAdding();
              UsersOwners.checkUsedServicePoints(addedServicePoints);

              cy.login(firstUserProperties.username, firstUserProperties.password, {
                path: SettingsMenu.usersOwnersPath,
                waiter: UsersOwners.waitLoading,
              });

              UsersOwners.unselectExistingServicePoint(addedServicePoints.at(-1));

              cy.login(secondUserProperties.username, secondUserProperties.password, {
                path: SettingsMenu.usersOwnersPath,
                waiter: UsersOwners.waitLoading,
              });

              UsersOwners.startNewLineAdding();
              UsersOwners.checkFreeServicePointPresence(addedServicePoints.at(-1));
              UsersOwners.cancelAdding();
              // clearing of test data collector from outdated information
              addedServicePoints.pop();
              UsersOwners.deleteOwner();
            });
          });
        });
      },
    );

    afterEach(() => {
      cy.getAdminToken();
      testUsers.forEach((user) => users.deleteViaApi(user.userId));
    });
  });
});
