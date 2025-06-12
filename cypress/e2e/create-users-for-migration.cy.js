/*
This file is to be executed on Okapi env before migration to Eureka.
After migration, a set of tests to be run on Eureka using these users instead of creating new ones.
List of tests to be run: https://foliotest.testrail.io/index.php?/runs/view/3030.
Cypress config parameter defining a switch to using pre-defined users in those tests: "migrationTest: true".
*/

import uuid from 'uuid';
import PermissionSets from '../support/fragments/settings/users/permissionSets';
import Users from '../support/fragments/users/users';
import MigrationData, { migrationUsers } from '../support/migrationData';

let patronGroupId;

function deleteAllMigrationSetsAndUsers() {
  cy.getAdminToken();
  cy.getPermissionsApi({ limit: 500, query: 'displayName="migration_permission_set*"' }).then(
    ({ body }) => {
      body.permissions.forEach((permissionSet) => {
        PermissionSets.deletePermissionSetViaApi(permissionSet.id);
      });
    },
  );
  Users.getUsers({ limit: 500, query: 'username="migration_username*"' }).then((users) => {
    users.forEach((user) => {
      Users.deleteViaApi(user.id);
    });
  });
  cy.wait(3000);
}

describe('Create or delete users for migration from Okapi to Eureka', () => {
  before('Get user group', () => {
    cy.getAdminToken();
    cy.getUserGroups({ query: 'group<>"AT_*"' }).then((groupId) => {
      patronGroupId = groupId;
    });
  });

  it('Delete all migration permission sets and users', { tags: ['deleteMigrationUsers'] }, () => {
    deleteAllMigrationSetsAndUsers();
  });

  it(
    'Create permission sets and users for migration from Okapi to Eureka',
    { tags: ['createMigrationUsers'] },
    () => {
      deleteAllMigrationSetsAndUsers();

      cy.getAdminToken();
      migrationUsers.forEach((user) => {
        const permissionSetBody = {
          displayName: `migration_permission_set_${user.caseId}`,
          description: 'Permission set for migration testing.',
          subPermissions: user.permissions,
          mutable: true,
          id: uuid(),
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

        PermissionSets.createPermissionSetViaApi(permissionSetBody).then((createdSet) => {
          Users.createViaApi(userBody).then((createdUser) => {
            cy.wait(500);
            cy.setUserPassword({
              username: createdUser.username,
              password: MigrationData.password,
            });
            cy.addPermissionsToNewUserApi({
              userId: createdUser.id,
              permissions: [createdSet.id],
            });
          });
        });
      });
    },
  );
});
