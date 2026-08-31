import { recurse } from 'cypress-recurse';
import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { SORT_DIRECTIONS } from '../../support/constants';
import getRandomPostfix from '../../support/utils/stringTools';

function clickColumnHeaderAndSettle(column) {
  Lists.clickLandingPageColumnHeader(column);
  cy.wait(1000);
}

function waitForRefreshToComplete(listId) {
  return recurse(
    () => Lists.getListByIdViaApi(listId),
    (body) => Boolean(body.successRefresh) && body.successRefresh.status === 'SUCCESS',
    { limit: 40, timeout: 180 * 1000, delay: 5000 },
  );
}

describe('Lists', () => {
  describe('Lists landing page', () => {
    let userData;
    const createdListNames = [];
    const postfix = getRandomPostfix();

    const permissions = [
      Permissions.listsAll.gui,
      Permissions.uiUsersView.gui,
      Permissions.uiUsersViewLoans.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersDelete.gui,
      Permissions.uiOrganizationsViewEditCreate.gui,
      Permissions.uiOrganizationsViewEditDelete.gui,
    ];

    // Creates `count` lists sharing the same recordType/fqlQuery/isActive and returns
    // their ids. Active lists auto-refresh on creation, so each id's refresh is
    // awaited individually - refresh completion order does not match creation order.
    function createListsBatch(namePrefix, listBase, count) {
      const ids = [];

      const width = String(count).length;
      const names = Array.from(
        { length: count },
        (_, i) => `${namePrefix}_${String(i + 1).padStart(width, '0')}_${postfix}`,
      );
      createdListNames.push(...names);

      return cy
        .wrap(names)
        .each((name) => Lists.createViaApi({ ...listBase, name }).then((body) => ids.push(body.id)))
        .then(() => {
          if (!listBase.isActive) return ids;
          return cy
            .wrap(ids)
            .each((id) => Lists.refreshViaApi(id))
            .then(() => cy.wrap(ids).each((id) => waitForRefreshToComplete(id)));
        });
    }

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser(permissions).then((userProperties) => {
        userData = userProperties;

        cy.getUserToken(userData.username, userData.password).then(() => {
          // ~40 Active "Users" lists with Records = 0
          Lists.buildQueryOnActiveUsersWithZeroRecords().then(({ query }) => {
            createListsBatch(
              'AT_C1434659_zero',
              {
                description: `Test list for C1434659 ${postfix}`,
                recordType: 'Users',
                fqlQuery: query.fqlQuery,
                isActive: true,
                isPrivate: true,
              },
              40,
            );
          });

          // ~30 Active "Users" lists with Records > 0
          Lists.buildQueryOnActiveUsers().then(({ query }) => {
            createListsBatch(
              'AT_C1434659_activeUsers',
              {
                description: `Test list for C1434659 ${postfix}`,
                recordType: 'Users',
                fqlQuery: query.fqlQuery,
                isActive: true,
                isPrivate: true,
              },
              30,
            );
          });

          // ~20 Active "Instances" lists with a larger Records count
          Lists.buildQueryOnAllInstances().then(({ query }) => {
            createListsBatch(
              'AT_C1434659_instances',
              {
                description: `Test list for C1434659 ${postfix}`,
                recordType: 'Instances',
                fqlQuery: query.fqlQuery,
                isActive: true,
                isPrivate: true,
              },
              20,
            );
          });

          // ~15 Inactive lists, never refreshed - Records/Last updated are null
          Lists.buildQueryOnActiveUsersWithZeroRecords().then(({ query }) => {
            createListsBatch(
              'AT_C1434659_inactive',
              {
                description: `Test list for C1434659 ${postfix}`,
                recordType: 'Users',
                fqlQuery: query.fqlQuery,
                isActive: false,
                isPrivate: true,
              },
              15,
            );
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
      'C1434659 Verify sorting in the "Lists" table (athena)',
      { tags: ['extendedPath', 'athena', 'C1434659'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // The landing page shows every list in the shared tenant, not just the ones this
        // test creates. Scope the view to this run's own lists so sort verification isn't
        // affected by unrelated pre-existing/other-suite lists (e.g. never-refreshed ones
        // with a blank "Last updated" that legitimately have nothing to do with this test).
        Lists.searchLists(postfix);

        // #1 Landing page opens sorted by "List name" ascending by default
        Lists.verifyLandingPageColumnSortDirection('List name', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('List name', SORT_DIRECTIONS.ASCENDING);

        // #2 Only "Records" and "Last updated" columns are sortable
        Lists.verifyLandingPageColumnSortable('Records', true);
        Lists.verifyLandingPageColumnSortable('Last updated', true);
        Lists.verifyLandingPageColumnSortable('Record type', false);
        Lists.verifyLandingPageColumnSortable('Status', false);
        Lists.verifyLandingPageColumnSortable('Source', false);
        Lists.verifyLandingPageColumnSortable('Visibility', false);

        // #3 Click "List name" header -> descending
        clickColumnHeaderAndSettle('List name');
        Lists.verifyLandingPageColumnSortDirection('List name', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('List name', SORT_DIRECTIONS.DESCENDING);

        // #4 Click "List name" header again -> back to ascending
        clickColumnHeaderAndSettle('List name');
        Lists.verifyLandingPageColumnSortDirection('List name', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('List name', SORT_DIRECTIONS.ASCENDING);

        // #5 Click "Records" header -> ascending, null (never refreshed) lists come first,
        // "List name" is no longer the active sort column
        clickColumnHeaderAndSettle('Records');
        Lists.verifyLandingPageColumnSortDirection('List name', 'none');
        Lists.verifyLandingPageColumnSortDirection('Records', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Records', SORT_DIRECTIONS.ASCENDING);

        // #6 Reload the page (F5) -> sorting by "Records" is preserved
        cy.reload();
        Lists.waitLoading();
        Lists.verifyLandingPageColumnSortDirection('Records', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Records', SORT_DIRECTIONS.ASCENDING);

        // #7 Click "Records" header again -> descending, null lists come last
        clickColumnHeaderAndSettle('Records');
        Lists.verifyLandingPageColumnSortDirection('Records', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Records', SORT_DIRECTIONS.DESCENDING);

        // #8 Click "Last updated" header -> ascending, oldest jobs on top,
        // "Records" is no longer the active sort column
        clickColumnHeaderAndSettle('Last updated');
        Lists.verifyLandingPageColumnSortDirection('Records', 'none');
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.ASCENDING);

        // #9 Click "Last updated" header again -> descending, most recent jobs on top
        clickColumnHeaderAndSettle('Last updated');
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);

        // #10 Clear the "Status" filter -> filtered lists update, sorting is preserved,
        // "Reset all" becomes enabled
        Lists.verifyClearFilterButton('Status');
        Lists.clickOnClearFilterButton('Status');
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);

        // #11 Navigate to the next/previous page -> sorting is preserved on both pages
        Lists.clickLandingPageNextButton();
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.clickLandingPagePreviousButton();
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);

        // #12 Click "Reset all" -> filters are reset, sorting is preserved
        Lists.resetAllFilters();
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);
      },
    );
  });
});
