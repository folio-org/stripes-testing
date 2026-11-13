import { APPLICATION_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();
      const rolesNamePrefix = 'AT_C1602452_Role_';
      const testData = {
        roles: [
          { name: `${rolesNamePrefix}1_${randomPostfix}` },
          { name: `${rolesNamePrefix}2_${randomPostfix}` },
        ],
      };
      // the window widths of steps 4 and 6 stand for the narrower window (e.g. with docked DevTools)
      const narrowViewport = { width: 1200, height: 800 };
      const narrowerViewport = { width: 1000, height: 800 };

      before('Create user and roles', () => {
        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiAuthorizationRolesSettingsEdit],
          );
        });
        testData.roles.forEach((role) => {
          cy.createAuthorizationRoleApi(role.name, `${role.name} description`).then((created) => {
            role.id = created.id;
          });
        });

        cy.then(() => {
          cy.login(testData.user.username, testData.user.password, { authRefresh: true });
        });
      });

      after('Delete user and roles', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(testData.user.userId);
        testData.roles.forEach((role) => {
          cy.deleteAuthorizationRoleApi(role.id, true);
        });
      });

      it(
        'C1602452 Authorization roles listing pane fills available width after role detail pane is closed (eureka)',
        { tags: ['extendedPath', 'eureka', 'C1602452'] },
        () => {
          const [firstRole, secondRole] = testData.roles;

          // Step 1: Settings > Authorization roles; the listing pane fills the width next to "Settings"
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsPane.selectSettingsTab(SETTINGS_SUBSECTION_AUTH_ROLES);
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.verifyRolesListingPaneFillsAvailableWidth();
          // only the roles of the test are used further
          AuthorizationRoles.searchRole(rolesNamePrefix);
          AuthorizationRoles.checkRoleFound(firstRole.name);
          AuthorizationRoles.checkRoleFound(secondRole.name);

          // Step 2: Click a role; the detail pane opens next to the listing pane, both are visible
          AuthorizationRoles.clickOnRoleName(firstRole.name);
          AuthorizationRoles.verifyRolesListingAndDetailPanesFitWidth();

          // Step 3: Close the detail pane; the listing pane takes the full width, no blank space
          AuthorizationRoles.closeRoleDetailView(firstRole.name);
          AuthorizationRoles.verifyRolesListingPaneFillsAvailableWidth();

          // Step 4: Open a role, change the window width; both panes fit it, the detail is not collapsed
          AuthorizationRoles.clickOnRoleName(firstRole.name);
          cy.viewport(narrowViewport.width, narrowViewport.height);
          AuthorizationRoles.verifyRolesListingAndDetailPanesFitWidth();

          // Step 5: Close the detail pane; the listing pane takes the full width, no blank space
          AuthorizationRoles.closeRoleDetailView(firstRole.name);
          AuthorizationRoles.verifyRolesListingPaneFillsAvailableWidth();

          // Step 6: Open a role > Actions > Edit, change the window width; "Edit role" fits it
          AuthorizationRoles.clickOnRoleName(firstRole.name);
          AuthorizationRoles.openForEdit(firstRole.name);
          cy.viewport(narrowerViewport.width, narrowerViewport.height);
          AuthorizationRoles.verifyRoleEditPageFitsWindow();

          // Step 7: Close "Edit role"; the detail pane is next to the listing pane, none is collapsed
          AuthorizationRoles.closeRoleEditView();
          AuthorizationRoles.verifyRoleDetailPaneOpened(firstRole.name);
          AuthorizationRoles.verifyRolesListingAndDetailPanesFitWidth();

          // Step 8: Close the detail pane; the listing pane takes the full width, no blank space
          AuthorizationRoles.closeRoleDetailView(firstRole.name);
          AuthorizationRoles.verifyRolesListingPaneFillsAvailableWidth();

          // Step 9: Click a role; the detail pane has the normal width, its content is visible
          // (UISAUTHCOM-114 / STCOM-1578: the pane can stay collapsed until it is fixed)
          AuthorizationRoles.clickOnRoleName(secondRole.name);
          AuthorizationRoles.verifyRoleDetailPaneOpened(secondRole.name);
          AuthorizationRoles.verifyRolesListingAndDetailPanesFitWidth();
        },
      );
    });
  });
});
