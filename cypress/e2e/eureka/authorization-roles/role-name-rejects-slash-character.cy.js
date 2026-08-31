import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles, {
  nameSlashErrorText,
  nameRequiredErrorText,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Capabilities from '../../../support/dictionary/capabilities';
import { AUTHORIZATION_ROLE_TYPES } from '../../../support/constants/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        roleNameWithSlash: 'role/admin',
        roleNameWithoutSlash: 'roleadmin',
        roleName: `AT_C1464157 Cataloger basic-view.v1~2 \\ (EU) #1 & Co_x ${randomPostfix}`,
        roleDescription: `Role for cataloging: view/create records (EU) #1 ${randomPostfix}`,
        updatedRoleName1: `AT_C1464157 Cataloger basic-view.v1~2 \\ (EU) #1 & Co_x ${randomPostfix}/`,
        updatedRoleName2: `AT_C1464157 Cataloger basic-view.v1~2 \\ (EU) #2 & Co_x ${randomPostfix}`,
        roleId: null,
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesSettingsEdit,
      ];
      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create user and login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      after('Delete user and role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user?.userId);
        if (testData.roleId) cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C1464157 Role name field rejects the "/" character on create and edit role forms (eureka)',
        { tags: ['extendedPath', 'eureka', 'C1464157'] },
        () => {
          // Step 1: Click "+ New"; verify create pane with empty name, no error, save disabled
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.checkErrorForNameField({ isError: false });

          // Step 2: Type "role/admin"; verify slash error shown inline, save stays disabled
          AuthorizationRoles.fillRoleNameDescription(testData.roleNameWithSlash);
          AuthorizationRoles.focusOnNameField();
          AuthorizationRoles.checkErrorForNameField({
            isError: true,
            errorText: nameSlashErrorText,
          });
          AuthorizationRoles.checkSaveButton(false);

          // Step 3: Delete "/" so field reads "roleadmin"; verify error gone, save enabled
          AuthorizationRoles.fillRoleNameDescription(testData.roleNameWithoutSlash);
          AuthorizationRoles.focusOnNameField();
          AuthorizationRoles.checkErrorForNameField({ isError: false });
          AuthorizationRoles.checkSaveButton(true);

          // Step 4: Clear name field entirely; verify no error, save disabled
          AuthorizationRoles.fillRoleNameDescription('');
          AuthorizationRoles.focusOnNameField();
          AuthorizationRoles.checkErrorForNameField({ isError: false });
          AuthorizationRoles.checkSaveButton(false);

          // Step 5: Click outside name field; verify "Please fill this in" error, no slash error, save disabled
          AuthorizationRoles.focusOnNameField({ isFocused: false });
          AuthorizationRoles.checkErrorForNameField({
            isError: true,
            errorText: nameRequiredErrorText,
          });
          AuthorizationRoles.checkSaveButton(false);

          // Step 6: Fill in name and description with special characters; verify no error, save enabled
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.focusOnNameField();
          AuthorizationRoles.checkErrorForNameField({ isError: false });
          AuthorizationRoles.checkSaveButton(true);

          // Step 7: Save; verify success callout, detail pane, role in list with Type = "Regular"
          cy.intercept('POST', '/roles*').as('rolesCreate');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@rolesCreate').then(({ response }) => {
            testData.roleId = response.body.id;
          });
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);
          AuthorizationRoles.verifyRoleType(testData.roleName, AUTHORIZATION_ROLE_TYPES.REGULAR);

          // Step 8: Open edit pane; verify name and description pre-filled, save enabled
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.verifyNameDescriptionInEditForm(
            testData.roleName,
            testData.roleDescription,
          );
          AuthorizationRoles.checkSaveButton();

          // Step 9: Type "/" at end of name field; verify slash error shown, save disabled
          AuthorizationRoles.focusOnNameField();
          AuthorizationRoles.fillRoleNameDescription(
            testData.updatedRoleName1,
            testData.roleDescription,
          );
          AuthorizationRoles.focusOnNameField();
          AuthorizationRoles.checkErrorForNameField({
            isError: true,
            errorText: nameSlashErrorText,
          });
          AuthorizationRoles.checkSaveButton(false);

          // Step 10: Delete "/", change name to #2 version, save; verify success and updated values
          AuthorizationRoles.fillRoleNameDescription(
            testData.updatedRoleName2,
            testData.roleDescription,
          );
          AuthorizationRoles.focusOnNameField();
          AuthorizationRoles.checkErrorForNameField({ isError: false });
          AuthorizationRoles.checkSaveButton(true);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(
            testData.updatedRoleName2,
            testData.roleDescription,
          );
          AuthorizationRoles.verifyRoleRow(testData.updatedRoleName2, testData.roleDescription);
        },
      );
    });
  });
});
