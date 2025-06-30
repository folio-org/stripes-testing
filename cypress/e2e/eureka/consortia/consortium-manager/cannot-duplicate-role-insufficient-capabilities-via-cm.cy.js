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
    const centralRoleName = `AT_C552355_CentralRole_${randomPostfix}`;
    const memberRoleName = `AT_C552355_MemberRole_${randomPostfix}`;
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.EDIT,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.DELETE,
      },
    ];
    const capabSetsToAssignMember = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.EDIT,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings',
        action: CAPABILITY_ACTIONS.DELETE,
      },
    ];
    let userData;
    let centralRoleId;
    let memberRoleId;

    before(
      'Create user, assign affiliations and capabilities, create roles in both tenants',
      () => {
        cy.getAdminToken();
        cy.createTempUser([])
          .then((userProperties) => {
            userData = userProperties;
            cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
            cy.createAuthorizationRoleApi(centralRoleName).then((role) => {
              centralRoleId = role.id;
            });
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, userData.userId);
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMember);
            cy.createAuthorizationRoleApi(memberRoleName).then((role) => {
              memberRoleId = role.id;
            });
          });
      },
    );

    after('Delete user and roles', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      if (centralRoleId) {
        cy.deleteAuthorizationRoleApi(centralRoleId, true);
      }
      cy.setTenant(Affiliations.College);
      if (memberRoleId) {
        cy.deleteAuthorizationRoleApi(memberRoleId, true);
      }
    });

    it(
      'C552355 ECS | Eureka | User with insufficient capabilities can not duplicate an authorization role in Consortium manager (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C552355'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college]);
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);
        // Central tenant
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(centralRoleName);
        AuthorizationRoles.checkRoleFound(centralRoleName);
        AuthorizationRoles.clickOnRoleName(centralRoleName);
        AuthorizationRoles.clickActionsButton(centralRoleName);
        AuthorizationRoles.checkDuplicateOptionShown(false);
        // Member tenant
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(memberRoleName);
        AuthorizationRoles.checkRoleFound(memberRoleName);
        AuthorizationRoles.clickOnRoleName(memberRoleName);
        AuthorizationRoles.clickActionsButton(memberRoleName);
        AuthorizationRoles.checkDuplicateOptionShown(false);
      },
    );
  });
});
