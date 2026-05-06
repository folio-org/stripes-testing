import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Capabilities from '../../../../support/dictionary/capabilities';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      sharedRoleName: `AT_C1263896_UserRole_${randomPostfix}_Shared`,
      memberRoleName: `AT_C1263896_UserRole_${randomPostfix}_Member`,
      memberRoleNameUpdated: `AT_C1263896_UserRole_Updated_${randomPostfix}_Member`,
      sharedRoleCapabilitySets: [CapabilitySets.uiOrganizationsView],
      memberRoleCollegeCapabilitySets: [CapabilitySets.uiInventoryHoldingsCreate],
      memberRoleUniversityCapabilitySets: [CapabilitySets.uiInventoryItemCreate],
    };

    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesSettingsDelete,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
      CapabilitySets.consortiaSharingRolesAllItemCreate,
      CapabilitySets.consortiaSharingRolesAllItemDelete,
    ];

    const capabSetsToAssignMembers = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesSettingsDelete,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
    ];

    const capabsToAssign = [Capabilities.settingsEnabled];

    const sharedRoleCapabSetIds = [];
    const memberRoleCollegeCapabSetIds = [];
    const memberRoleUniversityCapabSetIds = [];
    let testUser;
    let sharedRoleId;
    let memberRoleCollegeId;
    let memberRoleUniversityId;
    let userSharedRole;
    let userMemberRoleCollege;
    let userMemberRoleUniversity;

    const verifyPageNotReloaded = (checkCallback) => {
      let pageReloaded = false;
      cy.window().then((win) => {
        win.addEventListener('beforeunload', () => {
          pageReloaded = true;
        });
      });

      checkCallback();

      cy.then(() => {
        expect(pageReloaded).to.equal(false);
      });
    };

    before('Create users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      // Prepare capability set IDs
      testData.sharedRoleCapabilitySets.forEach((capabilitySet) => {
        capabilitySet.table = capabilitySet.type;
      });
      testData.memberRoleCollegeCapabilitySets.forEach((capabilitySet) => {
        capabilitySet.table = capabilitySet.type;
      });
      testData.memberRoleUniversityCapabilitySets.forEach((capabilitySet) => {
        capabilitySet.table = capabilitySet.type;
      });

      cy.then(() => {
        // Create users in Central tenant
        cy.createTempUser([]).then((userProperties) => {
          testUser = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          userSharedRole = userProperties;
        });
      })
        .then(() => {
          // Assign capabilities to test user in Central
          cy.assignCapabilitiesToExistingUser(
            testUser.userId,
            capabsToAssign,
            capabSetsToAssignCentral,
          );
          cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
          cy.assignAffiliationToUser(Affiliations.University, testUser.userId);

          // Create shared role in Central
          cy.createAuthorizationRoleApi(testData.sharedRoleName).then((role) => {
            sharedRoleId = role.id;
            testData.sharedRoleCapabilitySets.forEach((capabilitySet) => {
              cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
                sharedRoleCapabSetIds.push(capabSetId);
              });
            });
          });

          // Get capability set IDs for member roles
          cy.setTenant(Affiliations.College);
          testData.memberRoleCollegeCapabilitySets.forEach((capabilitySet) => {
            cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
              memberRoleCollegeCapabSetIds.push(capabSetId);
            });
          });
          cy.setTenant(Affiliations.University);
          testData.memberRoleUniversityCapabilitySets.forEach((capabilitySet) => {
            cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
              memberRoleUniversityCapabSetIds.push(capabSetId);
            });
          });
        })
        .then(() => {
          // Add capability sets to shared role and assign user
          cy.resetTenant();
          cy.addCapabilitySetsToNewRoleApi(sharedRoleId, sharedRoleCapabSetIds);
          cy.addRolesToNewUserApi(userSharedRole.userId, [sharedRoleId]);

          // Share the role with all member tenants
          cy.shareRoleWithCapabilitiesApi({ id: sharedRoleId, name: testData.sharedRoleName });

          // Set up College tenant
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            testUser.userId,
            capabsToAssign,
            capabSetsToAssignMembers,
          );

          // Create user in College tenant
          cy.createTempUser([]).then((userProperties) => {
            userMemberRoleCollege = userProperties;
          });

          // Create member role in College
          cy.createAuthorizationRoleApi(testData.memberRoleName).then((role) => {
            memberRoleCollegeId = role.id;
            cy.addCapabilitySetsToNewRoleApi(memberRoleCollegeId, memberRoleCollegeCapabSetIds);
            cy.addRolesToNewUserApi(userMemberRoleCollege.userId, [memberRoleCollegeId]);
          });

          // Set up University tenant
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(
            testUser.userId,
            capabsToAssign,
            capabSetsToAssignMembers,
          );

          // Create user in University tenant
          cy.createTempUser([]).then((userProperties) => {
            userMemberRoleUniversity = userProperties;
          });

          // Create member role in University
          cy.createAuthorizationRoleApi(testData.memberRoleName).then((role) => {
            memberRoleUniversityId = role.id;
            cy.addCapabilitySetsToNewRoleApi(
              memberRoleUniversityId,
              memberRoleUniversityCapabSetIds,
            );
            cy.addRolesToNewUserApi(userMemberRoleUniversity.userId, [memberRoleUniversityId]);
          });
        })
        .then(() => {
          cy.resetTenant();
          cy.login(testUser.username, testUser.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      Users.deleteViaApi(userSharedRole.userId);
      cy.deleteSharedRoleApi({ id: sharedRoleId, name: testData.sharedRoleName }, true);
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(userMemberRoleCollege.userId);
      cy.deleteAuthorizationRoleApi(memberRoleCollegeId, true);
      cy.setTenant(Affiliations.University);
      Users.deleteViaApi(userMemberRoleUniversity.userId);
      cy.deleteAuthorizationRoleApi(memberRoleUniversityId, true);
    });

    it(
      'C1263896 ECS | Edit shared authorization role when roles with the same name exist in member tenants (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C1263896'] },
      () => {
        // Step 1: Navigate to Consortium Manager and select all tenants
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.waitLoading();
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(3);

        // Step 2: Select Central tenant and verify shared role
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.sharedRoleName);
        AuthorizationRoles.clickOnRoleName(testData.sharedRoleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.sharedRoleName);

        // Step 3: Click user profile and select "Switch active affiliation"
        ConsortiumManager.openSelectAffiliationModal();
        verifyPageNotReloaded(() => {
          AuthorizationRoles.verifyRoleViewPane(testData.sharedRoleName);
        });

        // Step 4: Cancel the modal
        ConsortiumManager.clickCancelInSelectAffiliationModal();
        AuthorizationRoles.verifyRoleViewPane(testData.sharedRoleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.sharedRoleName);

        // Step 5: Open Edit role page
        AuthorizationRoles.openForEdit(testData.sharedRoleName);

        // Step 6: Try to edit name to match member roles - should fail
        AuthorizationRoles.fillRoleNameDescription(testData.memberRoleName);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.verifySaveNameError([tenantNames.college, tenantNames.university]);
        AuthorizationRoles.closeRoleEditView();

        // Step 7: Verify member role in College unchanged
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(testData.memberRoleName);
        AuthorizationRoles.clickOnRoleName(testData.memberRoleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.memberRoleName, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter('1');
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.memberRoleCollegeCapabilitySets.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.checkUsersAccordion(1);

        // Step 8: Verify member role in University unchanged
        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole(testData.memberRoleName);
        AuthorizationRoles.clickOnRoleName(testData.memberRoleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.memberRoleName, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter('1');
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.memberRoleUniversityCapabilitySets.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.checkUsersAccordion(1);

        // Step 9: Delete role in University
        AuthorizationRoles.clickDeleteRole(testData.memberRoleName);
        AuthorizationRoles.confirmDeleteRole(testData.memberRoleName);

        // Step 10: Select Central and verify shared role
        SelectMembers.selectMember(tenantNames.central);

        AuthorizationRoles.searchRole(testData.sharedRoleName);
        AuthorizationRoles.clickOnRoleName(testData.sharedRoleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.sharedRoleName);

        // Step 11: Try to edit shared role to lowercase member name - should fail
        AuthorizationRoles.openForEdit(testData.sharedRoleName);
        AuthorizationRoles.fillRoleNameDescription(testData.memberRoleName.toLowerCase());
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.verifySaveNameError([tenantNames.college]);
        AuthorizationRoles.closeRoleEditView();

        // Step 12: Verify College member role unchanged
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(testData.memberRoleName);
        AuthorizationRoles.clickOnRoleName(testData.memberRoleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.memberRoleName, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter('1');
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.memberRoleCollegeCapabilitySets.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.checkUsersAccordion(1);

        // Step 13: Edit College member role to different name - should succeed
        AuthorizationRoles.openForEdit(testData.memberRoleName);
        AuthorizationRoles.fillRoleNameDescription(testData.memberRoleNameUpdated);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.memberRoleNameUpdated);

        // Step 14: Select Central and open shared role for edit
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.searchRole(testData.sharedRoleName);
        AuthorizationRoles.clickOnRoleName(testData.sharedRoleName);
        AuthorizationRoles.openForEdit(testData.sharedRoleName);

        // Step 15: Edit shared role to original member name - should succeed
        AuthorizationRoles.fillRoleNameDescription(testData.memberRoleName);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.memberRoleName);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter('1');
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.sharedRoleCapabilitySets.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.checkUsersAccordion(1);
      },
    );
  });
});
