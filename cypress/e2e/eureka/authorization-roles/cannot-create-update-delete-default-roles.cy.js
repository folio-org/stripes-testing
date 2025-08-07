/* eslint-disable no-console */
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import { AUTHORIZATION_ROLE_TYPES, APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        updatedRoleName: `AT_C794509_UserRole_${getRandomPostfix()}`,
        updatedRoleDescription: `Description C794509 ${getRandomPostfix()}`,
        deleteErrorText:
          'Role could not be deleted: Default role cannot be created, updated or deleted via roles API.',
        createErrorText: 'Role could not be created: Failed to create keycloak role',
        updateErrorText:
          'Role could not be updated: Default role cannot be created, updated or deleted via roles API.',
      };

      const defaultRoles = [];
      const defaultSystemRoles = [];

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesSettingsEdit,
        CapabilitySets.uiAuthorizationRolesSettingsDelete,
      ];

      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create role, user', () => {
        cy.getAdminToken();
        cy.getAuthorizationRoles({
          limit: 500,
          query: `type=${AUTHORIZATION_ROLE_TYPES.DEFAULT.toUpperCase()}`,
        }).then((roles) => {
          console.log('C794509 [BEFORE block] after getAuthorizationRoles');
          cy.log('C794509 [BEFORE block] after getAuthorizationRoles');
          defaultRoles.push(...roles);
          defaultSystemRoles.push(
            ...defaultRoles.filter((role) => role.name.includes('default-system-role')),
          );
        });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          console.log('C794509 [BEFORE block] after assignCapabilitiesToExistingUser');
          cy.log('C794509 [BEFORE block] after assignCapabilitiesToExistingUser');
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              SETTINGS_SUBSECTION_AUTH_ROLES,
            );
            console.log('C794509 [BEFORE block] after login');
            cy.log('C794509 [BEFORE block] after login');
            AuthorizationRoles.waitContentLoading();
            cy.reload();
          }, 20_000);
          AuthorizationRoles.waitContentLoading();
          console.log('C794509 [BEFORE block] after authn/refresh');
          cy.log('C794509 [BEFORE block] after authn/refresh');
        });
      });

      after('Delete role, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        console.log('C794509 [AFTER block] after deleteViaApi');
        cy.log('C794509 [AFTER block] after deleteViaApi');
      });

      it(
        'C794509 Default roles cannot be created/edited/deleted (eureka)',
        { tags: ['criticalPath', 'eureka', 'C794509'] },
        () => {
          AuthorizationRoles.searchRole(defaultRoles[0].name);
          AuthorizationRoles.clickOnRoleName(defaultRoles[0].name);
          console.log('C794509 [TEST body] after clickOnRoleName(defaultRoles[0].name)');
          cy.log('C794509 [TEST body] after clickOnRoleName(defaultRoles[0].name)');
          AuthorizationRoles.verifyRoleType(defaultRoles[0].name, AUTHORIZATION_ROLE_TYPES.DEFAULT);
          console.log(
            'C794509 [TEST body] after verifyRoleType(defaultRoles[0].name, AUTHORIZATION_ROLE_TYPES.DEFAULT)',
          );
          cy.log(
            'C794509 [TEST body] after verifyRoleType(defaultRoles[0].name, AUTHORIZATION_ROLE_TYPES.DEFAULT)',
          );
          AuthorizationRoles.clickDeleteRole();
          cy.intercept('DELETE', '/roles/*').as('deleteCall');
          AuthorizationRoles.confirmDeleteRole(testData.roleName, true);
          console.log('C794509 [TEST body] after confirmDeleteRole');
          cy.log('C794509 [TEST body] after confirmDeleteRole');
          cy.wait('@deleteCall').then(({ response }) => {
            console.log('C794509 [TEST body] after deleteCall');
            expect(response.statusCode).to.eq(400);
            expect(response.body.errors[0].message).to.eq(testData.deleteErrorText.split(': ')[1]);
          });
          InteractorsTools.checkCalloutErrorMessage(testData.deleteErrorText);
          console.log(
            'C794509 [TEST body] after checkCalloutErrorMessage(testData.deleteErrorText)',
          );
          cy.log('C794509 [TEST body] after checkCalloutErrorMessage(testData.deleteErrorText)');
          InteractorsTools.closeAllVisibleCallouts();

          AuthorizationRoles.cancelDeleteRole(defaultRoles[0].name);
          AuthorizationRoles.clickNewButton();
          console.log('C794509 [TEST body] after clickNewButton');
          cy.log('C794509 [TEST body] after clickNewButton');
          AuthorizationRoles.fillRoleNameDescription(defaultSystemRoles[0].name);
          cy.intercept('POST', '/roles').as('createCall');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@createCall').then(({ response }) => {
            console.log('C794509 [TEST body] after createCall');
            cy.log('C794509 [TEST body] after createCall');
            expect(response.statusCode).to.eq(409);
            expect(response.body.errors[0].message).to.eq(testData.createErrorText.split(': ')[1]);
          });
          InteractorsTools.checkCalloutErrorMessage(testData.createErrorText);
          console.log(
            'C794509 [TEST body] after checkCalloutErrorMessage(testData.createErrorText)',
          );
          cy.log('C794509 [TEST body] after checkCalloutErrorMessage(testData.createErrorText)');
          InteractorsTools.closeAllVisibleCallouts();

          AuthorizationRoles.closeRoleCreateView();
          AuthorizationRoles.searchRole(defaultRoles[1].name);
          AuthorizationRoles.clickOnRoleName(defaultRoles[1].name);
          console.log('C794509 [TEST body] after clickOnRoleName(defaultRoles[1].name)');
          cy.log('C794509 [TEST body] after clickOnRoleName(defaultRoles[1].name)');
          AuthorizationRoles.verifyRoleType(defaultRoles[1].name, AUTHORIZATION_ROLE_TYPES.DEFAULT);
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.fillRoleNameDescription(
            `${defaultRoles[1].name} UPD`,
            `${defaultRoles[1].description} UPD`,
          );
          cy.intercept('PUT', '/roles/*').as('updateCall1');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@updateCall1').then(({ response }) => {
            console.log('C794509 [TEST body] after updateCall1');
            cy.log('C794509 [TEST body] after updateCall1');
            expect(response.statusCode).to.eq(400);
            expect(response.body.errors[0].message).to.eq(testData.updateErrorText.split(': ')[1]);
          });
          InteractorsTools.checkCalloutErrorMessage(testData.updateErrorText);
          InteractorsTools.closeAllVisibleCallouts();

          AuthorizationRoles.closeRoleEditView();
          AuthorizationRoles.searchRole(defaultSystemRoles[1].name);
          AuthorizationRoles.clickOnRoleName(defaultSystemRoles[1].name);
          console.log('C794509 [TEST body] after clickOnRoleName(defaultSystemRoles[1].name)');
          cy.log('C794509 [TEST body] after clickOnRoleName(defaultSystemRoles[1].name)');
          AuthorizationRoles.verifyRoleType(
            defaultSystemRoles[1].name,
            AUTHORIZATION_ROLE_TYPES.DEFAULT,
          );
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.clickUnassignAllCapabilitiesButton();
          cy.intercept('PUT', '/roles/*').as('updateCall2');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@updateCall2').then(({ response }) => {
            console.log('C794509 [TEST body] after updateCall2');
            cy.log('C794509 [TEST body] after updateCall2');
            expect(response.statusCode).to.eq(400);
            expect(response.body.errors[0].message).to.eq(testData.updateErrorText.split(': ')[1]);
          });
          InteractorsTools.checkCalloutErrorMessage(testData.updateErrorText);
          AuthorizationRoles.closeRoleEditView();
          console.log('C794509 [TEST body] after last step');
          cy.log('C794509 [TEST body] after last step');
        },
      );
    });
  });
});
