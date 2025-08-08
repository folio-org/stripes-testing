import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import Capabilities from '../../../../support/dictionary/capabilities';

describe('Eureka', () => {
  describe('Login', () => {
    describe('Consortia', () => {
      const testData = {
        appCallRegexpCentral: new RegExp(
          `\\/entitlements\\/${Affiliations.Consortia}\\/applications`,
        ),
        appCallRegexpCollege: new RegExp(
          `\\/entitlements\\/${Affiliations.College}\\/applications`,
        ),
      };

      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create users, data', () => {
        cy.clearCookies({ domain: null });
        cy.resetTenant();
        cy.getAdminToken();
        cy.getApplicationsForTenantApi(Affiliations.Consortia).then((appIds) => {
          testData.centralAppIds = appIds;
        });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.tempUser = createdUserProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.tempUser.userId);
          cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, capabsToAssign, []);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
          // need to wait for user policy creation to finish
          cy.wait(10000);
          cy.setTenant(Affiliations.College);
          cy.getApplicationsForTenantApi(Affiliations.College).then((appIds) => {
            testData.collegeAppIds = appIds;
          });
          cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, capabsToAssign, []);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
        });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.tempUser.userId);
      });

      it(
        'C449377 List of entitled applications retrieved properly on Central and Member tenants (consortia) (eureka)',
        { tags: ['smokeECS', 'eureka', 'C449377'] },
        () => {
          cy.resetTenant();
          cy.intercept('GET', testData.appCallRegexpCentral).as('appCallCentral');
          cy.login(testData.tempUser.username, testData.tempUser.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
          cy.wait('@appCallCentral').then(({ response }) => {
            const retrievedAppIds = response.body.applicationDescriptors.map(
              (descriptor) => descriptor.id,
            );
            expect(retrievedAppIds).to.have.lengthOf(testData.centralAppIds.length);
            testData.centralAppIds.forEach((id) => {
              // eslint-disable-next-line no-unused-expressions
              expect(retrievedAppIds.includes(id)).to.be.true;
            });
          });
          cy.intercept('GET', testData.appCallRegexpCollege).as('appCallCollege');
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.wait('@/authn/refresh', { timeout: 20000 });
          SettingsPane.waitLoading();
          cy.wait('@appCallCollege').then(({ response }) => {
            const retrievedAppIds = response.body.applicationDescriptors.map(
              (descriptor) => descriptor.id,
            );
            expect(retrievedAppIds).to.have.lengthOf(testData.collegeAppIds.length);
            testData.collegeAppIds.forEach((id) => {
              // eslint-disable-next-line no-unused-expressions
              expect(retrievedAppIds.includes(id)).to.be.true;
            });
          });
        },
      );
    });
  });
});
