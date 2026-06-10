import uuid from 'uuid';
import {
  APPLICATION_NAMES,
  CAPABILITY_ACTIONS,
  CAPABILITY_TYPES,
} from '../../../../../support/constants';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import SubjectTypes from '../../../../../support/fragments/settings/inventory/instances/subjectTypes';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectTypes from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectTypesConsortiumManager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject types', () => {
        let userA;
        let userB;

        const firstSubjectType = {
          name: `C594407 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'consortium',
          consortiaUser: 'System, System user - mod-consortia-keycloak',
          memberLbraries: 'All',
          id: uuid(),
        };
        const secondSubjectType = {
          name: `C594407 autotestSubjectTypeName${getRandomPostfix()}`,
          source: 'consortium',
          consortiaUser: 'System, System user - mod-consortia-keycloak',
          memberLbraries: 'All',
          id: uuid(),
        };

        const capabSetsUserACentral = [
          {
            type: CAPABILITY_TYPES.DATA,
            resource: 'UI-Consortia-Settings Consortium-Manager',
            action: CAPABILITY_ACTIONS.EDIT,
          },
          {
            type: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'UI-Consortia-Settings Consortium-Manager Share',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
          {
            type: CAPABILITY_TYPES.DATA,
            resource: 'UI-Consortia-Settings Consortium-Manager',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            type: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Inventory Settings Subject-Types',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];
        const capabSetsUserACollege = [
          {
            type: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Inventory Settings Subject-Types',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];
        const capabSetsUserAUniversity = [
          {
            type: CAPABILITY_TYPES.DATA,
            resource: 'UI-Organizations',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];
        const capabSetsUserB = [
          {
            type: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Inventory Settings Subject-Types',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];

        function openSubjectTypesSettings() {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_TYPES);
        }

        function verifySubjectTypeExistsInSettings(subjectType) {
          openSubjectTypesSettings();
          SubjectTypes.verifySubjectTypeExists(subjectType);
        }

        function verifySubjectTypeAbsentInSettings(subjectTypeName) {
          openSubjectTypesSettings();
          SubjectTypes.verifySubjectTypeAbsent(subjectTypeName);
        }

        function switchAffiliationAndVerifySubjectTypeExists(from, to, subjectType) {
          ConsortiumManagerSettings.switchActiveAffiliation(from, to);
          verifySubjectTypeExistsInSettings(subjectType);
        }

        function switchAffiliationAndVerifySubjectTypeAbsent(from, to, subjectTypeName) {
          ConsortiumManagerSettings.switchActiveAffiliation(from, to);
          verifySubjectTypeAbsentInSettings(subjectTypeName);
        }

        before('Create user and login', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();

          // Create User A in member-1 (College)
          cy.setTenant(Affiliations.College);
          cy.createTempUser([]).then((userProperties) => {
            userA = userProperties;
            cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsUserACollege);

            // Assign capabilitiy sets in Central
            cy.resetTenant();
            cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsUserACentral);

            // Assign User A affiliation to University and assign capability sets
            cy.assignAffiliationToUser(Affiliations.University, userA.userId);
            cy.setTenant(Affiliations.University);
            cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsUserAUniversity);

            // Create User B in Central
            cy.resetTenant();
            cy.createTempUser([]).then((userBProperties) => {
              userB = userBProperties;
              cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsUserB);

              // Assign User B affiliations
              cy.assignAffiliationToUser(Affiliations.College, userB.userId);
              cy.setTenant(Affiliations.College);
              cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsUserB);

              cy.resetTenant();
              cy.assignAffiliationToUser(Affiliations.University, userB.userId);
              cy.setTenant(Affiliations.University);
              cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsUserB);

              cy.resetTenant();
            });

            cy.waitForAuthRefresh(() => {
              cy.login(userA.username, userA.password);
              ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.college);
              cy.reload();
              ConsortiumManagerSettings.checkCurrentTenantInTopMenu(tenantNames.college);
              ConsortiumManagerSettings.switchActiveAffiliation(
                tenantNames.college,
                tenantNames.central,
              );
            }, 20_000);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);
        });

        it(
          'C594407 User with all Consortium manager permission (view, create, share) is able to create shared subject type via "Consortium manager" app (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594407'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembersModal.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Naviagate to Inventory -> Subject types settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectTypes.choose();

            // Step 3-4: Create subject type shared with all members and verify it is created and shared with all members
            ConsortiumSubjectTypes.createSubjectTypeSharedWithAllMembers(firstSubjectType.name);
            ConsortiumSubjectTypes.confirmShareWithAllMembers(firstSubjectType.name);
            ConsortiumSubjectTypes.verifySharedToAllMembersSubjectTypeExists(
              firstSubjectType.name,
              firstSubjectType.source,
              firstSubjectType.consortiaUser,
              firstSubjectType.memberLbraries,
              { actions: ['edit', 'trash'] },
            );

            // Step 5-6: Log in as user B and subject type is visible in settings
            cy.login(userB.username, userB.password);
            verifySubjectTypeExistsInSettings({
              name: firstSubjectType.name,
              source: firstSubjectType.source,
              user: firstSubjectType.consortiaUser,
              memberLbraries: firstSubjectType.memberLbraries,
            });

            // Step 7: Switch affiliation of user B (College) and verify subject type is visible in settings
            switchAffiliationAndVerifySubjectTypeExists(tenantNames.central, tenantNames.college, {
              name: firstSubjectType.name,
              source: firstSubjectType.source,
              user: firstSubjectType.consortiaUser,
              memberLbraries: firstSubjectType.memberLbraries,
            });

            // Step 8: Switch affiliation of user B (University) and verify subject type is visible in settings
            switchAffiliationAndVerifySubjectTypeExists(
              tenantNames.college,
              tenantNames.university,
              {
                name: firstSubjectType.name,
                source: firstSubjectType.source,
                user: firstSubjectType.consortiaUser,
                memberLbraries: firstSubjectType.memberLbraries,
              },
            );

            // Step 9: Log in as user A and switch affiliation to Central
            cy.login(userA.username, userA.password);
            ConsortiumManagerSettings.switchActiveAffiliation(
              tenantNames.college,
              tenantNames.central,
            );

            // Step 10: Naviagate to Consortium manager -> Inventory -> Subject types settings
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectTypes.choose();

            // Step 11-13: Clear name field and verify error message, then fill in new name and save changes
            ConsortiumSubjectTypes.clearAndVerifyErrorMessageAndEditName(
              firstSubjectType.name,
              secondSubjectType.name,
            );

            // Step 14: Verify subject type is updated with new name and shared with all members
            ConsortiumSubjectTypes.confirmShareWithAllMembers(secondSubjectType.name, 'updated');
            ConsortiumSubjectTypes.verifySharedToAllMembersSubjectTypeExists(
              secondSubjectType.name,
              secondSubjectType.source,
              secondSubjectType.consortiaUser,
              secondSubjectType.memberLbraries,
              { actions: ['edit', 'trash'] },
            );

            // Step 15-16: Delete subject type and verify it is deleted
            ConsortiumSubjectTypes.deleteBySubjectTypeName(secondSubjectType.name);
            ConsortiumSubjectTypes.verifySubjectTypeAbsent(firstSubjectType.name);

            // Step 17-18: Log in as user B and verify subject type is deleted in settings
            cy.login(userB.username, userB.password);
            verifySubjectTypeAbsentInSettings(secondSubjectType.name);

            // Step 19: Switch affiliation of user B (College) and verify subject type is deleted in settings
            switchAffiliationAndVerifySubjectTypeAbsent(
              tenantNames.central,
              tenantNames.college,
              secondSubjectType.name,
            );

            // Step 20: Switch affiliation of user B (University) and verify subject type is deleted in settings
            switchAffiliationAndVerifySubjectTypeAbsent(
              tenantNames.college,
              tenantNames.university,
              secondSubjectType.name,
            );
          },
        );
      });
    });
  });
});
