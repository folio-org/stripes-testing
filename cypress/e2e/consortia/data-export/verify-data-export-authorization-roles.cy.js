import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import { APPLICATION_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

let user;
const testData = {
  roleName: `AT_877107_Data_Export_Admin_${getRandomPostfix()}`,
  centralCapabSetIds: [],
  collegeCapabSetIds: [],
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
  CapabilitySets.uiInventory,
  CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
];

describe('Data Export', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;

        cy.createAuthorizationRoleApi(`AT_877107_Central_role_${getRandomPostfix()}`)
          .then((role) => {
            testData.centralRoleId = role.id;

            [...userCapabSets, CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit].forEach(
              (capabilitySet) => {
                cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
                  testData.centralCapabSetIds.push(capabSetId);
                });
              },
            );

            cy.addCapabilitySetsToNewRoleApi(testData.centralRoleId, testData.centralCapabSetIds);
            cy.addRolesToNewUserApi(user.userId, [testData.centralRoleId]);
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.createAuthorizationRoleApi(`AT_877107_College_role_${getRandomPostfix()}`).then(
              (role) => {
                testData.collegeRoleId = role.id;

                userCapabSets.forEach((capabilitySet) => {
                  cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
                    testData.collegeCapabSetIds.push(capabSetId);
                  });
                });

                cy.addCapabilitySetsToNewRoleApi(
                  testData.collegeRoleId,
                  testData.collegeCapabSetIds,
                );
                cy.addRolesToNewUserApi(user.userId, [testData.collegeRoleId]);
              },
            );
          });

        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.consortiumManagerPath,
          waiter: ConsortiumManagerApp.waitLoading,
        });
        ConsortiumManagerApp.chooseSettingsItem(settingsItems.authorizationRoles);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.deleteAuthorizationRoleApi(testData.centralRoleId);
      cy.deleteAuthorizationRoleApi(testData.roleId);
      Users.deleteViaApi(user.userId);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationRoleApi(testData.collegeRoleId);
    });

    it(
      'C877107 ECS | Verify data export authorization roles (consortia) (firebird)',
      { tags: ['extendedPathECS', 'firebird', 'C877107'] },
      () => {
        // Step 1: Select central tenant from "Member" dropdown
        ConsortiumManagerApp.selectTenantFromDropdown(tenantNames.central);

        const rolesToSearch = ['Data Export', 'Data Export Admin'];

        rolesToSearch.forEach((roleName) => {
          AuthorizationRoles.searchRole(roleName);
          AuthorizationRoles.verifyRolesCount(0);
        });

        AuthorizationRoles.searchRole('');

        // Step 2: Click "Actions" > "New"
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();

        // Step 3: Populate "Name*" field with any role name
        AuthorizationRoles.fillRoleNameDescription(testData.roleName);
        AuthorizationRoles.checkSaveButton();

        // Step 4: Click "Select application" button, Select all applications, Click "Save and close" button
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectAllApplicationsInModal();
        AuthorizationRoles.clickSaveInModal();
        AuthorizationRoles.checkCapabilitySpinnersShown();
        AuthorizationRoles.checkCapabilitySpinnersAbsent();

        // Step 5: Select capability sets in "Capability sets" accordion
        capabSetsToAssign.forEach((capabilitySet) => {
          capabilitySet.table = capabilitySet.type;
          AuthorizationRoles.selectCapabilitySetCheckbox(capabilitySet);
        });

        // Step 6: Click "Save" button
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(`${capabSetsToAssign.length}`);

        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          testData.roleId = roleId;
        });

        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(user.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.verifyAssignedUser(user.lastName, user.firstName);

        // Step 7: Re-login with current User to central tenant
        cy.login(user.username, user.password);

        const availableApplications = [
          APPLICATION_NAMES.CONSORTIUM_MANAGER,
          APPLICATION_NAMES.DATA_EXPORT,
          APPLICATION_NAMES.INVENTORY,
          APPLICATION_NAMES.MARC_AUTHORITY,
          APPLICATION_NAMES.SETTINGS,
        ];

        availableApplications.forEach((appName) => {
          TopMenuNavigation.verifyAppButtonShown(appName);
        });

        // Step 8: Open "Consortium manager" > "Authorization roles" page
        TopMenuNavigation.navigateToApp(
          APPLICATION_NAMES.CONSORTIUM_MANAGER,
          'Authorization roles',
        );
        AuthorizationRoles.waitContentLoading();
        ConsortiumManagerApp.selectTenantFromDropdown(tenantNames.college);

        rolesToSearch.forEach((roleName) => {
          AuthorizationRoles.searchRole(roleName);
          AuthorizationRoles.verifyRolesCount(0);
        });
      },
    );
  });
});
