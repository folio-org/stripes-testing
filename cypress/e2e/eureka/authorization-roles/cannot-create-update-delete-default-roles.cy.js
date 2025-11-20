import Users from '../../../support/fragments/users/users';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import { AUTHORIZATION_ROLE_TYPES, APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { including } from '../../../../interactors';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        createErrorText: 'Role could not be created: Failed to create keycloak role',
        updateErrorText:
          'Role could not be updated: Default role cannot be created, updated or deleted via roles API',
        deleteErrorText:
          'Role could not be deleted: Default role cannot be created, updated or deleted via roles API',
      };

      const defaultRoles = [];

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
          defaultRoles.push(...roles);
        });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              SETTINGS_SUBSECTION_AUTH_ROLES,
            );
          }, 20_000);
          AuthorizationRoles.waitContentLoading();
        });
      });

      after('Delete role, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C794509 Default roles cannot be created/edited/deleted (eureka)',
        { tags: ['criticalPath', 'eureka', 'C794509'] },
        () => {
          AuthorizationRoles.searchRole(defaultRoles[0].name);
          AuthorizationRoles.clickOnRoleName(defaultRoles[0].name);
          AuthorizationRoles.verifyRoleType(defaultRoles[0].name, AUTHORIZATION_ROLE_TYPES.DEFAULT);
          AuthorizationRoles.clickDeleteRole();
          AuthorizationRoles.confirmDeleteRole(defaultRoles[0].name, true);
          InteractorsTools.checkCalloutErrorMessage(including(testData.deleteErrorText));
          InteractorsTools.closeAllVisibleCallouts();
          AuthorizationRoles.cancelDeleteRole(defaultRoles[0].name);

          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(defaultRoles[0].name);
          cy.intercept('POST', '/roles').as('createCall');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@createCall').then(({ response }) => {
            expect(response.statusCode).to.eq(409);
            expect(response.body.errors[0].message).to.include(
              testData.createErrorText.split(': ')[1],
            );
          });
          InteractorsTools.checkCalloutErrorMessage(including(testData.createErrorText));
          InteractorsTools.closeAllVisibleCallouts();
          AuthorizationRoles.closeRoleCreateView();

          AuthorizationRoles.searchRole(defaultRoles[2].name);
          AuthorizationRoles.clickOnRoleName(defaultRoles[2].name);
          AuthorizationRoles.verifyRoleType(defaultRoles[2].name, AUTHORIZATION_ROLE_TYPES.DEFAULT);
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.fillRoleNameDescription(`${defaultRoles[2].name}_edited`);
          cy.intercept('PUT', '/roles/*').as('updateCall');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@updateCall').then(({ response }) => {
            expect(response.statusCode).to.eq(400);
            expect(response.body.errors[0].message).to.include(
              testData.updateErrorText.split(': ')[1],
            );
          });
          InteractorsTools.checkCalloutErrorMessage(including(testData.updateErrorText));
        },
      );
    });
  });
});
