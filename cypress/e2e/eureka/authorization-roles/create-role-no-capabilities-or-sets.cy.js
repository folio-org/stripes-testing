import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C430264_UserRole_${getRandomPostfix()}`,
        roleDescription: `Description ${getRandomPostfix()}`,
        firstApplicationName: 'app-licenses',
        secondApplicationName: 'app-acquisitions',
      };

      const regExpBase = `\\?limit=\\d{1,}&query=applicationId==\\(${testData.firstApplicationName}-.{1,}or.{1,}${testData.secondApplicationName}-.{1,}\\)`;
      const capabilityCallRegExp = new RegExp(`\\/capabilities${regExpBase}`);
      const capabilitySetsCallRegExp = new RegExp(`\\/capability-sets${regExpBase}`);

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsAdmin,
        CapabilitySets.capabilities,
        CapabilitySets.roleCapabilitySets,
      ];

      before(() => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      it(
        'C430264 Selecting applications when creating new authorization role (no capabilities selected) (eureka)',
        { tags: ['smoke', 'eureka', 'eurekaPhase1', 'shiftLeft', 'C430264'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.checkSaveButton(true);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifySelectApplicationModal();
          AuthorizationRoles.selectApplicationInModal(testData.firstApplicationName);
          AuthorizationRoles.selectApplicationInModal(testData.secondApplicationName);
          cy.intercept('GET', '/capabilities?*').as('capabilities');
          cy.intercept('GET', '/capability-sets?*').as('capabilitySets');
          AuthorizationRoles.clickSaveInModal();
          cy.wait('@capabilities').then(({ request, response }) => {
            const url = decodeURIComponent(request.url);
            expect(url).to.match(capabilityCallRegExp);
            expect(response.statusCode).to.eq(200);
          });
          cy.wait('@capabilitySets').then(({ request, response }) => {
            const url = decodeURIComponent(request.url);
            expect(url).to.match(capabilitySetsCallRegExp);
            expect(response.statusCode).to.eq(200);
          });
          AuthorizationRoles.verifyAppNamesInCapabilityTables([
            testData.firstApplicationName,
            testData.secondApplicationName,
          ]);
          cy.wait(2000);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion(false);
          AuthorizationRoles.clickOnCapabilitiesAccordion(false);
          AuthorizationRoles.verifyEmptyCapabilitiesAccordion();
          AuthorizationRoles.verifyEmptyCapabilitySetsAccordion();
        },
      );
    });
  });
});
