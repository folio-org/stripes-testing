import ServicePoints from '../../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../../../../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../../../../../support/fragments/settingsMenu';
import { parseSanityParameters } from '../../../../../../support/utils/users';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('Fees&Fines', () => {
  describe('Settings Users (Fee/fine)', () => {
    const servicePoints = [];
    const ownerNames = [];
    const { user, memberTenant } = parseSanityParameters();

    beforeEach(() => {
      cy.wrap(true).then(() => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password);
        cy.allure().logCommandSteps();
      }).then(() => {
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

        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: SettingsMenu.usersOwnersPath,
          waiter: UsersOwners.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
      });
    });

    after(() => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();

      servicePoints.forEach((servicePointId) => {
        ServicePoints.deleteViaApi(servicePointId.id);
      });

      ownerNames.forEach((ownerName) => {
        UsersOwners.getOwnerViaApi({ query: `owner==${ownerName}` }).then((owner) => UsersOwners.deleteViaApi(owner.id));
      });
    });

    it(
      'C350615 The "Shared" Fee/Fine Owner is not allowed to have Service Points (volaris)',
      { tags: ['dryRun', 'volaris', 'C350615'] },
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
});
