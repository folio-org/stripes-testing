import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import AuthorizationRoles from '../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { APPLICATION_NAMES } from '../../support/constants';

let user;
const testData = {
  roleName: `AT_877101_Data_Export_${getRandomPostfix()}`,
  capabSetIds: [],
};
const userCapabSets = [
  CapabilitySets.uiAuthorizationRolesSettingsCreate,
  CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
  CapabilitySets.uiUsersRolesView,
];
const capabSetsToAssign = [
  CapabilitySets.uiDataExportView,
  CapabilitySets.uiDataExportEdit,
  CapabilitySets.uiDataExportSettingsView,
  CapabilitySets.uiDataExportSettingsEdit,
];

describe('Data Export', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;

      cy.createAuthorizationRoleApi(`AT_877101_User_role_${getRandomPostfix()}`).then((role) => {
        testData.userRoleId = role.id;

        userCapabSets.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            testData.capabSetIds.push(capabSetId);
          });
        });

        cy.addCapabilitySetsToNewRoleApi(testData.userRoleId, testData.capabSetIds);
        cy.addRolesToNewUserApi(user.userId, [testData.userRoleId]);
      });

      cy.login(user.username, user.password, {
        path: TopMenu.settingsAuthorizationRoles,
        waiter: AuthorizationRoles.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.deleteAuthorizationRoleApi(testData.userRoleId);
    cy.deleteAuthorizationRoleApi(testData.roleId);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C877101 Verify data export authorization roles (firebird)',
    { tags: ['extendedPath', 'firebird', 'C877101'] },
    () => {
      // Step 1: Search for the following system defined authorization roles: "Data Export", "Data Export Admin"
      const rolesToSearch = ['Data Export', 'Data Export Admin'];

      rolesToSearch.forEach((roleName) => {
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.verifyRolesCount(0);
      });

      AuthorizationRoles.searchRole('');

      // Step 2: Click "New" button
      AuthorizationRoles.clickNewButton();
      AuthorizationRoles.checkSaveButton(false);

      // Step 3: Populate "Name*" field with any role name, e.g. "Data Export"
      AuthorizationRoles.fillRoleNameDescription(testData.roleName);
      AuthorizationRoles.checkSaveButton();

      // Step 4: Click "Select application" button, Select all applications, Click "Save and close" button
      AuthorizationRoles.clickSelectApplication();
      AuthorizationRoles.selectAllApplicationsInModal();
      AuthorizationRoles.clickSaveInModal();
      AuthorizationRoles.checkCapabilitySpinnersShown();
      AuthorizationRoles.checkCapabilitySpinnersAbsent();

      // Step 5: Select capability sets: UI-Data-Export View/Edit, UI-Data-Export Settings View/Edit, Click "Save & close" button
      capabSetsToAssign.forEach((capabilitySet) => {
        capabilitySet.table = capabilitySet.type;
        AuthorizationRoles.selectCapabilitySetCheckbox(capabilitySet);
      });

      AuthorizationRoles.clickSaveButton();
      AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
      AuthorizationRoles.checkCapabilitySetsAccordionCounter(`${capabSetsToAssign.length}`);

      cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
        testData.roleId = roleId;
      });

      // Step 6: Click "Assign/Unassign" button, Select current User, Click "Save" button
      AuthorizationRoles.clickOnRoleName(testData.roleName);
      AuthorizationRoles.clickAssignUsersButton();
      AuthorizationRoles.selectUserInModal(user.username);
      AuthorizationRoles.clickSaveInAssignModal();
      AuthorizationRoles.verifyAssignedUser(user.lastName, user.firstName);

      // Step 7: Re-login with current User
      cy.login(user.username, user.password);

      TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.DATA_EXPORT);
      TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.SETTINGS);
    },
  );
});
