import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations from '../../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      const usersOptions = {
        permissionSets: 'Permission sets',
        departments: 'Departments',
        patronGroups: 'Patron groups',
      };
      const centralCapabilitySets = [
        CapabilitySets.uiConsortiaSettingsConsortiumManagerView,
        CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
        CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
        CapabilitySets.uiConsortiaSettingsConsortiaAffiliationsView,
        CapabilitySets.uiUsersPermsEdit,
      ];
      const usersSettingsCapabilitySets = [
        CapabilitySets.uiUsersSettingsDepartmentsCreateEditViewEdit,
        CapabilitySets.uiUsersSettingsDepartmentsManage,
        CapabilitySets.uiUsersSettingsUsergroupsView,
        CapabilitySets.uiUsersSettingsUsergroupsManage,
      ];
      const memberCapabilitySets = [
        CapabilitySets.uiUsersSettingsPermsetsView,
        CapabilitySets.uiUsersSettingsPermsetsManage,
        ...usersSettingsCapabilitySets,
      ];
      let userData;
      let centralRoleId;
      let collegeRoleId;
      let centralCapabilitySetIds;

      before('Create test data', () => {
        centralCapabilitySetIds = [];
        cy.clearLocalStorage();
        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;

          cy.createAuthorizationRoleApi(`AT_C404379_CentralRole_${getRandomPostfix()}`).then(
            (role) => {
              centralRoleId = role.id;
              centralCapabilitySets.forEach((capabilitySet) => {
                cy.getCapabilitySetIdViaApi(capabilitySet).then((capabilitySetId) => {
                  centralCapabilitySetIds.push(capabilitySetId);
                });
              });
              cy.then(() => {
                cy.addCapabilitySetsToNewRoleApi(centralRoleId, centralCapabilitySetIds);
                cy.addRolesToNewUserApi(userData.userId, [centralRoleId]);
              });
            },
          );

          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.createAuthorizationRoleApi(`AT_C404379_CollegeRole_${getRandomPostfix()}`).then(
            (role) => {
              collegeRoleId = role.id;
              const collegeCapabilitySetIds = [];
              memberCapabilitySets.forEach((capabilitySet) => {
                cy.getCapabilitySetIdViaApi(capabilitySet).then((capabilitySetId) => {
                  collegeCapabilitySetIds.push(capabilitySetId);
                });
              });
              cy.then(() => {
                cy.addCapabilitySetsToNewRoleApi(collegeRoleId, collegeCapabilitySetIds);
                cy.addRolesToNewUserApi(userData.userId, [collegeRoleId]);
              });
            },
          );

          cy.resetTenant();
          cy.login(userData.username, userData.password);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.deleteAuthorizationRoleApi(centralRoleId);
        Users.deleteViaApi(userData.userId);
        cy.setTenant(Affiliations.College);
        cy.deleteAuthorizationRoleApi(collegeRoleId);
        cy.resetTenant();
      });

      it(
        'C404379 User without "Settings (Users)" permissions in central tenant is NOT able to view options under "Users" pane in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['extendedPathECS', 'thunderjet', 'C404379'] },
        () => {
          // Step 1: Click "Consortium manager" app button in the header
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.verifyStatusOfConsortiumManager();
          ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

          // Step 2: Select all members
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

          // Step 3: Click "Users" in "Settings" pane
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          Object.values(usersOptions).forEach((option) => {
            ConsortiumManagerApp.checkOptionInOpenedPane(settingsItems.users, option, false);
          });

          // Steps 4–10 are not applicable to 'Eureka' environments.

          // Step 11: Log out, add "Settings (Users)" capability sets to the central role via API
          cy.logout();
          cy.getAdminToken();
          const usersSettingsCapabilitySetIds = [];
          usersSettingsCapabilitySets.forEach((capabilitySet) => {
            cy.getCapabilitySetIdViaApi(capabilitySet).then((capabilitySetId) => {
              usersSettingsCapabilitySetIds.push(capabilitySetId);
            });
          });
          cy.then(() => {
            cy.updateCapabilitySetsForRoleApi(centralRoleId, [
              ...centralCapabilitySetIds,
              ...usersSettingsCapabilitySetIds,
            ]);
          });

          // Step 12: Log in again, open "Consortium manager" and click "Users" in "Settings" pane
          cy.login(userData.username, userData.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          ConsortiumManagerApp.checkOptionInOpenedPane(
            settingsItems.users,
            usersOptions.departments,
          );
          ConsortiumManagerApp.checkOptionInOpenedPane(
            settingsItems.users,
            usersOptions.patronGroups,
          );
        },
      );
    });
  });
});
