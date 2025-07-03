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

describe('Check roles for migrated users', () => {
  it(
    'C805757 Check roles for migrated users (eureka)',
    { tags: ['eurekaMigration', 'C805757', 'checkRolesForMigrationUsers'] },
    () => {
      cy.loginAsAdmin();
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
      Users.waitLoading();

      migrationUsers.forEach((user) => {
        UsersSearchPane.searchByKeywords(MigrationData.getUsername(user.caseId));
        UsersCard.verifyUserLastFirstNameInCard(
          MigrationData.getLastName(user.caseId),
          MigrationData.getFirstName(user.caseId),
        );
        UsersCard.verifyUserRolesCounter('1');
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([`migration_permission_set_${user.caseId}`]);
        UsersCard.verifyUserRolesRowsCount(1);
        UsersCard.close();
        UsersSearchPane.resetAllFilters();
        UsersSearchResultsPane.verifySearchPaneIsEmpty();
      });
    },
  );
});
