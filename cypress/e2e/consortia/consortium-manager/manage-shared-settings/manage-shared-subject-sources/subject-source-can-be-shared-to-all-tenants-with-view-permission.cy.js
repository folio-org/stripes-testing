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
import SubjectSources from '../../../../../support/fragments/settings/inventory/instances/subjectSources';
import SelectMembersModal from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManagerSettings from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumSubjectSources from '../../../../../support/fragments/consortium-manager/inventory/instances/subjectSourcesConsortiumManager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Subject sources', () => {
        let userA;
        let userB;

        const firstSubjectSource = {
          name: `C594430 autotestSubjectSourceName${getRandomPostfix()}`,
          source: 'consortium',
          consortiaUser: 'System, System user - mod-consortia-keycloak',
          memberLbraries: 'All',
          id: uuid(),
        };
        const secondSubjectSource = {
          name: `C594430 autotestSubjectSourceName${getRandomPostfix()}`,
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
            resource: 'UI-Inventory Settings Subject-Sources',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];
        const capabSetsUserACollege = [
          {
            type: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Inventory Settings Subject-Sources',
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
            resource: 'UI-Inventory Settings Subject-Sources',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ];

        function openSubjectSourceSettings() {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.SUBJECT_SOURCES);
        }

        function verifySubjectSourceExistsInSettings(subjectSource) {
          openSubjectSourceSettings();
          SubjectSources.verifySubjectSourceExists(
            subjectSource.name,
            subjectSource.source,
            subjectSource.user,
          );
        }

        function verifySubjectSourceAbsentInSettings(subjectSourceName) {
          openSubjectSourceSettings();
          SubjectSources.verifySubjectSourceAbsent(subjectSourceName);
        }

        function switchAffiliationAndVerifySubjectSourceExists(from, to, subjectSource) {
          ConsortiumManagerSettings.switchActiveAffiliation(from, to);
          verifySubjectSourceExistsInSettings(subjectSource);
        }

        function switchAffiliationAndVerifySubjectSourceAbsent(from, to, subjectSourceName) {
          ConsortiumManagerSettings.switchActiveAffiliation(from, to);
          verifySubjectSourceAbsentInSettings(subjectSourceName);
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
          'C594430 User with all Consortium manager permission (view, create, share) is able to create shared subject source via "Consortium manager" app (folijet)',
          { tags: ['criticalPathECS', 'folijet', 'C594430'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembersModal.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Naviagate to Inventory -> Subject sources settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectSources.choose();

            // Step 3-4: Create subject source shared with all members and verify it is created and shared with all members
            ConsortiumSubjectSources.createSharedWithAllMembersSubjectSource(
              firstSubjectSource.name,
            );
            ConsortiumSubjectSources.confirmShareWithAllMembers(firstSubjectSource.name);
            ConsortiumSubjectSources.verifySharedSubjectSourceExists({
              name: firstSubjectSource.name,
              source: firstSubjectSource.source,
              actions: ['edit', 'trash'],
            });

            // Step 5-6: Log in as user B and subject source is visible in settings
            cy.login(userB.username, userB.password);
            verifySubjectSourceExistsInSettings({
              name: firstSubjectSource.name,
              source: firstSubjectSource.source,
              user: firstSubjectSource.consortiaUser,
            });

            // Step 7: Switch affiliation of user B (College) and verify subject source is visible in settings
            switchAffiliationAndVerifySubjectSourceExists(
              tenantNames.central,
              tenantNames.college,
              {
                name: firstSubjectSource.name,
                source: firstSubjectSource.source,
                user: firstSubjectSource.consortiaUser,
              },
            );

            // Step 8: Switch affiliation of user B (University) and verify subject source is visible in settings
            switchAffiliationAndVerifySubjectSourceExists(
              tenantNames.college,
              tenantNames.university,
              {
                name: firstSubjectSource.name,
                source: firstSubjectSource.source,
                user: firstSubjectSource.consortiaUser,
              },
            );

            // Step 9: Log in as user A and switch affiliation to Central
            cy.login(userA.username, userA.password);
            ConsortiumManagerSettings.switchActiveAffiliation(
              tenantNames.college,
              tenantNames.central,
            );

            // Step 10: Naviagate to Consortium manager -> Inventory -> Subject sources settings
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ConsortiumSubjectSources.choose();

            // Step 11-13: Clear name field and verify error message, then fill in new name and save changes
            ConsortiumSubjectSources.clearAndVerifyErrorMessageAndEditName(
              firstSubjectSource.name,
              secondSubjectSource.name,
            );

            // Step 14: Verify subject source is updated with new name and shared with all members
            ConsortiumSubjectSources.confirmShareWithAllMembers(
              secondSubjectSource.name,
              'updated',
            );
            ConsortiumSubjectSources.verifySharedSubjectSourceExists({
              name: secondSubjectSource.name,
              source: secondSubjectSource.source,
              actions: ['edit', 'trash'],
            });

            // Step 15-16: Delete subject source and verify it is deleted
            ConsortiumSubjectSources.deleteSubjectSourceByName(secondSubjectSource.name);
            ConsortiumSubjectSources.confirmDeletionOfSubjectSource(secondSubjectSource.name);
            ConsortiumSubjectSources.verifySubjectSourceAbsent(secondSubjectSource.name);

            // Step 17-18: Log in as user B and verify subject source is deleted in settings
            cy.login(userB.username, userB.password);
            verifySubjectSourceAbsentInSettings(secondSubjectSource.name);

            // Step 19: Switch affiliation of user B (College) and verify subject source is deleted in settings
            switchAffiliationAndVerifySubjectSourceAbsent(
              tenantNames.central,
              tenantNames.college,
              secondSubjectSource.name,
            );

            // Step 20: Switch affiliation of user B (University) and verify subject source is deleted in settings
            switchAffiliationAndVerifySubjectSourceAbsent(
              tenantNames.college,
              tenantNames.university,
              secondSubjectSource.name,
            );
          },
        );
      });
    });
  });
});
