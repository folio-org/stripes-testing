/*
Temporary code to create roles and users AS IF they are migrated from Okapi to Eureka.
Only used to verify migration test approach.
*/

import Users from '../support/fragments/users/users';
import MigrationData, { migrationUsers } from '../support/migrationData';

let patronGroupId;

function deleteAllMigrationRolesAndUsers() {
  cy.getAdminToken();
  cy.getAuthorizationRoles({ limit: 500, query: 'name="migration_role*"' }).then((roles) => {
    roles.forEach((role) => {
      // Double-check just in case (because deleting useful roles can be a big problem)
      if (role.name.includes('migration_role')) cy.deleteAuthorizationRoleApi(role.id);
    });
  });
  Users.getUsers({ limit: 500, query: 'username="migration_username*"' }).then((users) => {
    users.forEach((user) => {
      Users.deleteViaApi(user.id);
    });
  });
  cy.wait(3000);
}

function getCapabilitiesAndAssignToRole(roleId, permissionNames) {
  let capabilitiesIds;
  let capabilitySetsIds;
  cy.okapiRequest({
    path: 'capabilities',
    searchParams: {
      query: `(permission=="${permissionNames.join('")or(permission=="')}")`,
      limit: 100,
    },
    isDefaultSearchParamsRequired: false,
  }).then((responseCapabs) => {
    capabilitiesIds = responseCapabs.body.capabilities.map((el) => el.id);
    cy.okapiRequest({
      path: 'capability-sets',
      searchParams: {
        query: `(permission=="${permissionNames.join('")or(permission=="')}")`,
        limit: 100,
      },
      isDefaultSearchParamsRequired: false,
    }).then((responseSets) => {
      capabilitySetsIds = responseSets.body.capabilitySets.map((el) => el.id);
      permissionNames.forEach((permissionName) => {
        // eslint-disable-next-line no-unused-expressions
        cy.expect(
          responseCapabs.body.capabilities.filter((capab) => capab.permission === permissionName)
            .length > 0 ||
            responseSets.body.capabilitySets.filter((set) => set.permission === permissionName)
              .length > 0,
          `Capabilities/sets found for "${permissionName}"`,
        ).to.be.true;
      });
      if (capabilitiesIds.length === 0) {
        cy.log('Warning: Capabilities not found!');
      } else {
        cy.addCapabilitiesToNewRoleApi(roleId, capabilitiesIds);
      }
      if (capabilitySetsIds.length === 0) {
        cy.log('Warning: Capability sets not found!');
      } else {
        cy.addCapabilitySetsToNewRoleApi(roleId, capabilitySetsIds);
      }
    });
  });
}

describe('Create or delete migration test users', () => {
  before('Get user group', () => {
    cy.getAdminToken();
    cy.getUserGroups({ query: 'group<>"AT_*"' }).then((groupId) => {
      patronGroupId = groupId;
    });
  });

  it('Delete all migration test roles and users', { tags: ['deleteMigrationUsersEureka'] }, () => {
    deleteAllMigrationRolesAndUsers();
  });

  it('Create migration test roles and users', { tags: ['createMigrationUsersEureka'] }, () => {
    deleteAllMigrationRolesAndUsers();

    cy.getAdminToken();
    migrationUsers.forEach((user) => {
      const roleData = {
        name: `migration_role_${user.caseId}`,
        description: 'Migration test role.',
      };

      const userBody = {
        type: 'staff',
        barcode: MigrationData.getBarcode(user.caseId),
        active: true,
        username: MigrationData.getUsername(user.caseId),
        patronGroup: patronGroupId,
        personal: {
          lastName: MigrationData.getLastName(user.caseId),
          firstName: MigrationData.getFirstName(user.caseId),
          email: 'migration@test.com',
          preferredContactTypeId: '002',
        },
      };

      cy.createAuthorizationRoleApi(roleData.name, roleData.description).then((createdRole) => {
        getCapabilitiesAndAssignToRole(createdRole.id, user.permissions);
        Users.createViaApi(userBody).then((createdUser) => {
          cy.setUserPassword({
            userId: createdUser.id,
            username: createdUser.username,
            password: MigrationData.password,
          }).then(() => {
            cy.wait(500);
            cy.addRolesToNewUserApi(createdUser.id, [createdRole.id]);
          });
        });
      });
    });
  });
});
