import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { SORT_DIRECTIONS } from '../../support/constants';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists landing page', () => {
    let userData;
    const createdListNames = [];

    function createListsBatch({ labelPrefix, recordType, fqlQuery, isActive, count }) {
      const listIds = [];
      for (let i = 1; i <= count; i++) {
        const listName = `AT_C1434659_${labelPrefix}_${i}_${getRandomPostfix()}`;
        createdListNames.push(listName);
        Lists.createViaApi({
          name: listName,
          description: 'Test list for C1434659',
          recordType,
          fqlQuery,
          isActive,
          isPrivate: true,
        }).then((body) => {
          listIds.push(body.id);
        });
      }
      // Only active lists get refreshed, so wait for the last one in the batch
      // to complete, giving the server time to compute Records/Last updated.
      if (isActive) {
        cy.then(() => Lists.waitForListToCompleteRefreshViaApi(listIds[listIds.length - 1]));
      }
    }

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        userData = userProperties;

        cy.getUserToken(userData.username, userData.password).then(() => {
          Lists.buildQueryOnActiveUsersWithZeroRecords().then(({ query: zeroRecordsQuery }) => {
            createListsBatch({
              labelPrefix: 'zero_active',
              recordType: 'Users',
              fqlQuery: zeroRecordsQuery.fqlQuery,
              isActive: true,
              count: 30,
            });
            createListsBatch({
              labelPrefix: 'zero_inactive',
              recordType: 'Users',
              fqlQuery: zeroRecordsQuery.fqlQuery,
              isActive: false,
              count: 15,
            });
          });

          Lists.buildQueryOnActiveUsers().then(({ query: activeUsersQuery }) => {
            createListsBatch({
              labelPrefix: 'active_users',
              recordType: 'Users',
              fqlQuery: activeUsersQuery.fqlQuery,
              isActive: true,
              count: 30,
            });
          });

          Lists.buildQueryOnAllInstances().then(({ query: instancesQuery }) => {
            createListsBatch({
              labelPrefix: 'all_instances',
              recordType: 'Instances',
              fqlQuery: instancesQuery.fqlQuery,
              isActive: true,
              count: 30,
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      cy.wrap(createdListNames).each((listName) => {
        Lists.deleteListByNameViaApi(listName);
      });
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C1434659 Verify sorting in the "Lists" table (athena) (TaaS)',
      { tags: ['extendedPath', 'athena', 'C1434659'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Default sort: "List name" ascending
        Lists.verifyLandingPageColumnSortDirection('List name', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('List name', SORT_DIRECTIONS.ASCENDING);

        // #2 Sortable/non-sortable column icons
        Lists.verifyLandingPageColumnSortable('Records', true);
        Lists.verifyLandingPageColumnSortable('Last updated', true);
        Lists.verifyLandingPageColumnSortable('Record type', false);
        Lists.verifyLandingPageColumnSortable('Status', false);
        Lists.verifyLandingPageColumnSortable('Source', false);
        Lists.verifyLandingPageColumnSortable('Visibility', false);

        // #3 Click "List name" -> descending
        Lists.clickLandingPageColumnHeader('List name');
        Lists.verifyLandingPageColumnSortDirection('List name', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('List name', SORT_DIRECTIONS.DESCENDING);

        // #4 Click "List name" again -> ascending
        Lists.clickLandingPageColumnHeader('List name');
        Lists.verifyLandingPageColumnSortDirection('List name', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('List name', SORT_DIRECTIONS.ASCENDING);

        // #5 Click "Records" -> ascending, null lists first, "List name" no longer active
        Lists.clickLandingPageColumnHeader('Records');
        Lists.verifyLandingPageColumnSortDirection('List name', 'none');
        Lists.verifyLandingPageColumnSortDirection('Records', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Records', SORT_DIRECTIONS.ASCENDING);

        // #6 Reload the page -> sorting is preserved
        cy.reload();
        Lists.waitLoading();
        Lists.verifyLandingPageColumnSortDirection('Records', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Records', SORT_DIRECTIONS.ASCENDING);

        // #7 Click "Records" again -> descending, null lists last
        Lists.clickLandingPageColumnHeader('Records');
        Lists.verifyLandingPageColumnSortDirection('Records', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Records', SORT_DIRECTIONS.DESCENDING);

        // #8 Click "Last updated" -> ascending, oldest on top
        Lists.clickLandingPageColumnHeader('Last updated');
        Lists.verifyLandingPageColumnSortDirection('Records', 'none');
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.ASCENDING);

        // #9 Click "Last updated" again -> most recent on top
        Lists.clickLandingPageColumnHeader('Last updated');
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);

        // #10 Clear "Status" filter -> filters applied, sort preserved, "Reset all" enabled
        Lists.verifyClearFilterButton('Status');
        Lists.clickOnClearFilterButton('Status');
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);

        // #11 Navigate through pages -> sort preserved
        Lists.clickLandingPageNextButton();
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.clickLandingPagePreviousButton();
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);

        // #12 Click "Reset all" -> sort preserved
        Lists.resetAllFilters();
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);
      },
    );
  });
});
