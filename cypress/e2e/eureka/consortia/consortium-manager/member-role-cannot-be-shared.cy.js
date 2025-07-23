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

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const roleName = `AT_C523604_RoleA_${randomPostfix}`;
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.EDIT,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'Consortia Sharing-Roles-All Item',
        action: CAPABILITY_ACTIONS.CREATE,
      },
      {
        type: CAPABILITY_TYPES.PROCEDURAL,
        resource: 'UI-Consortia-Settings Consortium-Manager Share',
        action: CAPABILITY_ACTIONS.EXECUTE,
      },
    ];
    const capabilitySetsToAssignMember = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'Consortia Sharing-Roles-All Item',
        action: CAPABILITY_ACTIONS.CREATE,
      },
    ];
    let userData;

    before('Create user, assign affiliations and capabilities, create role in Member', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabilitySetsToAssignMember);
          // Create the role in Member tenant
          cy.createAuthorizationRoleApi(roleName).then((role) => {
            userData.memberRoleId = role.id;
          });
        });
    });

    after('Delete user and role', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      cy.setTenant(Affiliations.College);
      if (userData.memberRoleId) {
        cy.deleteAuthorizationRoleApi(userData.memberRoleId, true);
      }
    });

    it(
      'C523604 ECS | Eureka | Role created in member tenant can not be shared (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C523604'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitLoading();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college]);
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);
        // Select Member tenant
        ConsortiumManagerApp.verifyTenantsInDropdown([tenantNames.central, tenantNames.college]);
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.clickOnRoleName(roleName);
        AuthorizationRoles.clickActionsButton(roleName);
        AuthorizationRoles.checkShareToAllButtonShown(false);
      },
    );
  });
});
