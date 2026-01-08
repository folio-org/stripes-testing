import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import Users from '../../../../support/fragments/users/users';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `AT_C877077_UserRole_${randomPostfix}`,
      roleNameUpdated: `AT_C877077_UserRole_Updated_${randomPostfix}`,
      originalCapabilitySets: [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Orders Orders',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Invoice Invoice',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
      newCapabilitySets: [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'Capabilities',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'Role-Capability-Sets',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
      ],
    };
    testData.originalCapabilitySets.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });
    testData.newCapabilitySets.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });

    let assignUser1Data;
    let assignUser2Data;

    before('Create users', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        assignUser1Data = userProperties;
      });
      cy.createTempUser([]).then((userProperties) => {
        assignUser2Data = userProperties;
      });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
        if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
      });
      cy.getUserRoleIdByNameApi(testData.roleNameUpdated).then((roleId) => {
        if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
      });
      Users.deleteViaApi(assignUser1Data.userId);
      Users.deleteViaApi(assignUser2Data.userId);
    });

    it(
      'C877077 ECS | Share an authorization role immediately after creation, edit it after sharing, and then delete it (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C877077'] },
      () => {
        cy.loginAsAdmin();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        SelectMembers.selectAllMembers();
        AuthorizationRoles.waitContentLoading(true);
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading(true);

        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        AuthorizationRoles.fillRoleNameDescription(testData.roleName);
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectAllApplicationsInModal(true);
        AuthorizationRoles.clickSaveInModal();
        testData.originalCapabilitySets.forEach((set) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(set);
        });
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.originalCapabilitySets.length}`,
        );

        AuthorizationRoles.shareRole(testData.roleName);
        AuthorizationRoles.openForEdit(testData.roleName);
        AuthorizationRoles.fillRoleNameDescription(testData.roleNameUpdated);
        testData.newCapabilitySets.forEach((set) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(set);
        });
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.roleNameUpdated);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleNameUpdated);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${testData.originalCapabilitySets.length + testData.newCapabilitySets.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        [...testData.originalCapabilitySets, ...testData.newCapabilitySets].forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.searchRole(testData.roleNameUpdated);
        AuthorizationRoles.clickOnRoleName(testData.roleNameUpdated);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleNameUpdated);
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        [...testData.originalCapabilitySets, ...testData.newCapabilitySets].forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });

        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.searchRole(testData.roleNameUpdated);
        AuthorizationRoles.clickOnRoleName(testData.roleNameUpdated);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleNameUpdated);
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        [...testData.originalCapabilitySets, ...testData.newCapabilitySets].forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.searchRole(testData.roleNameUpdated);
        AuthorizationRoles.clickOnRoleName(testData.roleNameUpdated);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleNameUpdated);

        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
        AuthorizationRoles.clickAssignUsersButton();
        AuthorizationRoles.selectUserInModal(assignUser1Data.username);
        AuthorizationRoles.selectUserInModal(assignUser2Data.username);
        AuthorizationRoles.clickSaveInAssignModal();
        AuthorizationRoles.checkUsersAccordion(2);
        AuthorizationRoles.verifyAssignedUser(
          assignUser1Data.lastName,
          assignUser1Data.firstName,
          true,
        );
        AuthorizationRoles.verifyAssignedUser(
          assignUser2Data.lastName,
          assignUser2Data.firstName,
          true,
        );
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleNameUpdated);

        AuthorizationRoles.clickDeleteRole(testData.roleNameUpdated);
        AuthorizationRoles.confirmDeleteRole(testData.roleNameUpdated);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(testData.roleNameUpdated);
        AuthorizationRoles.checkRoleFound(testData.roleNameUpdated, false);

        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole(testData.roleNameUpdated);
        AuthorizationRoles.checkRoleFound(testData.roleNameUpdated, false);
      },
    );
  });
});
