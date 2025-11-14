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
          AuthorizationRoles.checkActionsOptionsAvailable(false, true, false);

          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(defaultSystemRoles[0].name);
          cy.intercept('POST', '/roles').as('createCall');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@createCall').then(({ response }) => {
            expect(response.statusCode).to.eq(409);
            expect(response.body.errors[0].message).to.include(
              testData.createErrorText.split(': ')[1],
            );
          });
          InteractorsTools.checkCalloutErrorMessage(including(testData.createErrorText));

          AuthorizationRoles.closeRoleCreateView();
          AuthorizationRoles.searchRole(defaultRoles[1].name);
          AuthorizationRoles.clickOnRoleName(defaultRoles[1].name);
          AuthorizationRoles.verifyRoleType(defaultRoles[1].name, AUTHORIZATION_ROLE_TYPES.DEFAULT);
          AuthorizationRoles.checkActionsOptionsAvailable(false, true, false);

          AuthorizationRoles.searchRole(defaultSystemRoles[1].name);
          AuthorizationRoles.clickOnRoleName(defaultSystemRoles[1].name);
          AuthorizationRoles.verifyRoleType(
            defaultSystemRoles[1].name,
            AUTHORIZATION_ROLE_TYPES.DEFAULT,
          );
          AuthorizationRoles.checkActionsOptionsAvailable(false, true, false);
        },
      );
    });
  });
});
