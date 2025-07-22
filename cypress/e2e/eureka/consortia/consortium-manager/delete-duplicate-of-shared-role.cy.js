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
import { including } from '../../../../../interactors';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `AT_C663331_UserRole_${randomPostfix}`,
    };
    const duplicatedRoleNamePart = `${testData.roleName} (duplicate)`;
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Users Settings',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.EDIT,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'Consortia Sharing-Roles-All Item',
        action: CAPABILITY_ACTIONS.CREATE,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'Consortia Sharing-Roles-All Item',
        action: CAPABILITY_ACTIONS.DELETE,
      },
    ];
    const capabSetsToAssignMembers = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabsToAssign = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const testUser = {};
    const assignUserCentral = {};

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.createTempUser([]).then((userProperties) => {
          Object.assign(testUser, userProperties);
        });
        cy.createTempUser([]).then((userProperties) => {
          Object.assign(assignUserCentral, userProperties);
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
          cy.then(() => {
            cy.getCapabilitiesApi(2).then((capabs) => {
              cy.getCapabilitySetsApi(2).then((capabSets) => {
                cy.addCapabilitiesToNewRoleApi(
                  testData.roleId,
                  capabs.map((capab) => capab.id),
                );
                cy.addCapabilitySetsToNewRoleApi(
                  testData.roleId,
                  capabSets.map((capab) => capab.id),
                );
              });
            });
          }).then(() => {
            cy.shareRoleWithCapabilitiesApi({ id: testData.roleId, name: testData.roleName }).then(
              () => {
                cy.setTenant(Affiliations.College);
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
              },
            );
          });
        });
      });
    });

    before('Assign roles', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.addRolesToNewUserApi(assignUserCentral.userId, [testData.roleId]);
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      Users.deleteViaApi(assignUserCentral.userId);
      cy.deleteSharedRoleApi({ id: testData.roleId, name: testData.roleName }, true);
      cy.getUserRoleIdByNameApi(`${duplicatedRoleNamePart}*`).then((roleId) => {
        cy.deleteAuthorizationRoleApi(roleId, true);
      });
    });

    it(
      'C663331 ECS | Eureka | Delete shared duplicated authorization role from consortium manager with user assigned to it (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C663331'] },
      () => {
        cy.resetTenant();
        cy.login(testUser.username, testUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        AuthorizationRoles.waitContentLoading();
        SelectMembers.selectAllMembers();
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCentral.lastName,
          assignUserCentral.firstName,
          true,
        );

        AuthorizationRoles.duplicateRole(testData.roleName);
        AuthorizationRoles.clickDeleteRole(including(duplicatedRoleNamePart));
        AuthorizationRoles.confirmDeleteRole(including(duplicatedRoleNamePart));

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(duplicatedRoleNamePart);
        AuthorizationRoles.checkRoleFound(including(duplicatedRoleNamePart), false);
      },
    );
  });
});
