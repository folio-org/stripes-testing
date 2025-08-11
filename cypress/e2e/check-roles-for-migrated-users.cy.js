/*
Checks that each migrated test user has only one expected role assgned to it.
*/

import MigrationData, { migrationUsers } from '../support/migrationData';
import Users from '../support/fragments/users/users';
import UsersCard from '../support/fragments/users/usersCard';
import TopMenuNavigation from '../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../support/constants';
import UsersSearchPane from '../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../support/fragments/users/usersSearchResultsPane';

/*
These users have hash-roles due to EUREKA-798
Uncomment in case this will be deemed a non-issue
*/
const usersWithHashRoles = [
  // 'c359587',
  // 'c375072',
  // 'c375076',
  // 'c375077',
  // 'c380503',
  // 'c388524',
  // 'c396393',
];

describe('Check roles for migrated users', () => {
  it(
    'C805757 Check roles for migrated users (eureka)',
    { tags: ['eurekaMigration', 'C805757', 'checkRolesForMigrationUsers'] },
    () => {
      cy.loginAsAdmin();
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
      Users.waitLoading();

      migrationUsers.forEach((user) => {
        const username = MigrationData.getUsername(user.caseId);
        const rolesCount = usersWithHashRoles.includes(user.caseId) ? 2 : 1;
        UsersSearchPane.searchByKeywords(username);
        UsersCard.verifyUserLastFirstNameInCard(
          MigrationData.getLastName(user.caseId),
          MigrationData.getFirstName(user.caseId),
        );
        UsersCard.verifyUserRolesCounter(`${rolesCount}`);
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([`migration_permission_set_${user.caseId}`]);
        UsersCard.verifyUserRolesRowsCount(rolesCount);
        UsersCard.close();
        UsersSearchPane.resetAllFilters();
        UsersSearchResultsPane.verifySearchPaneIsEmpty();
      });
    },
  );
});
