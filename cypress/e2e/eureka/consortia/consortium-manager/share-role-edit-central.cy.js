import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../../support/constants';
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
      roleName: `AT_C523609_UserRole_${randomPostfix}`,
      roleNameUpdated: `AT_C523609_UserRole_Updated_${randomPostfix}`,
      roleDescription: `AT_C523609_Role_Description_${randomPostfix}`,
      originalCapabilitySets: [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Fund-Budget',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
      newCapabilitySets: [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Invoice Invoice',
          action: CAPABILITY_ACTIONS.CREATE,
        },
      ],
    };
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
      CapabilitySets.consortiaSharingRolesAllItemCreate,
    ];
    const capabSetsToAssignMembers = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
    ];
    const capabsToAssign = [Capabilities.settingsEnabled];
    const capabSetIds = [];
    let userAData;
    let testUser;
    let assignUserCentralData;
    let assignUserCollegeData;

    testData.originalCapabilitySets.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });
    testData.newCapabilitySets.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.createTempUser([]).then((userProperties) => {
          userAData = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          testUser = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          assignUserCentralData = userProperties;
        });
      }).then(() => {
        cy.assignCapabilitiesToExistingUser(
          testUser.userId,
          capabsToAssign,
          capabSetsToAssignCentral,
        );
        cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
        cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          testData.roleId = role.id;
        });
        testData.originalCapabilitySets.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            capabSetIds.push(capabSetId);
          });
        });
        cy.setTenant(Affiliations.College);
        cy.createTempUser([]).then((userProperties) => {
          assignUserCollegeData = userProperties;
        });
        cy.assignCapabilitiesToExistingUser(
          testUser.userId,
          capabsToAssign,
          capabSetsToAssignMembers,
        );
        cy.setTenant(Affiliations.University);
        cy.wait(10_000);
        cy.assignCapabilitiesToExistingUser(
          testUser.userId,
          capabsToAssign,
          capabSetsToAssignMembers,
        );
      });
    });

    before('Assign capabilities, role, login', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.addCapabilitySetsToNewRoleApi(testData.roleId, capabSetIds);
      cy.addRolesToNewUserApi(userAData.userId, [testData.roleId]);
      cy.login(testUser.username, testUser.password);
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      Users.deleteViaApi(userAData.userId);
      Users.deleteViaApi(assignUserCentralData.userId);
      cy.deleteAuthorizationRoleApi(testData.roleId);
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(assignUserCollegeData.userId);
    });

    it(
      'C523609 ECS | Eureka | Share authorization role and edit it from central tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C523609'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants(
          [tenantNames.central, tenantNames.college, tenantNames.university].sort(),
        );
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.checkMember(tenantNames.university, false);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyTenantsInDropdown(
          [tenantNames.central, tenantNames.college].sort(),
        );
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.shareRole(testData.roleName, { verifyModal: true });
        AuthorizationRoles.openForEdit(testData.roleName);
        AuthorizationRoles.fillRoleNameDescription('', testData.roleDescription);
        testData.originalCapabilitySets.forEach((set) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(set, false);
        });
        testData.newCapabilitySets.forEach((set) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(set);
        });
        AuthorizationRoles.checkSaveButton(false);
        AuthorizationRoles.fillRoleNameDescription(
          testData.roleNameUpdated,
          testData.roleDescription,
        );
        AuthorizationRoles.checkSaveButton();
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.roleNameUpdated, testData.roleDescription);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(assignUserCentralData.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.checkUsersAccordion(2);
        AuthorizationRoles.verifyAssignedUser(userAData.lastName, userAData.firstName);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCentralData.lastName,
          assignUserCentralData.firstName,
        );

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleNameUpdated);
        AuthorizationRoles.clickOnRoleName(testData.roleNameUpdated);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.newCapabilitySets.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.newCapabilitySets.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleNameUpdated);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(assignUserCollegeData.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCollegeData.lastName,
          assignUserCollegeData.firstName,
        );

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleNameUpdated);
        AuthorizationRoles.clickOnRoleName(testData.roleNameUpdated);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.newCapabilitySets.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        testData.newCapabilitySets.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.checkActionsButtonShown(false, testData.roleNameUpdated);
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.closeAssignModal();

        cy.login(userAData.username, userAData.password);
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.INVOICES);
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.FINANCE, false);
      },
    );
  });
});
