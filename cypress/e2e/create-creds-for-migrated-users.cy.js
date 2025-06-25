/*
Assigns predefined password to each migrated user (useful in case passwords were lost during the migration)
*/

import MigrationData, { migrationUsers } from '../support/migrationData';

describe('Create credentials for migrated users', () => {
  it('Create credentials for migrated users', { tags: ['createCredsForMigrationUsers'] }, () => {
    cy.getAdminToken();
    cy.getUsers({ limit: 100, query: 'username="migration_username*"' }).then((migratedUsers) => {
      cy.expect(migratedUsers.length).to.eq(migrationUsers.length);
      migratedUsers.forEach((user) => {
        cy.setUserPassword({
          userId: user.id,
          username: user.username,
          password: MigrationData.password,
        }).then(() => {
          cy.wait(500);
        });
      });
    });
  });
});
