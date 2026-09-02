import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Search & filter, sort lists', () => {
    let userData = {};
    const postfix = getRandomPostfix();
    // Other tests leave their own lists behind on the environment, so every order assertion is
    // made on a table narrowed down by a search term unique to this run: `sortedListsToken`
    // matches only the five lists whose order is asserted, `allListsToken` matches those five
    // plus the filler lists created to push the table over its 100 rows per page.
    const allListsToken = `C1434659_${postfix}`;
    const sortedListsToken = `${allListsToken}_SORT`;
    const fillerListsCount = 96;
    const fillerListName = (index) => `AT_${allListsToken}_FILL_${index}`;
    const sortedListName = (letter) => `AT_${sortedListsToken}_${letter}`;

    const LIST_NAME = 'List name';
    const RECORD_TYPE = 'Record type';
    const RECORDS = 'Records';
    const STATUS = 'Status';
    const SOURCE = 'Source';
    const LAST_UPDATED = 'Last updated';
    const VISIBILITY = 'Visibility';

    const permissions = [
      Permissions.listsAll.gui,
      Permissions.uiUsersView.gui,
      Permissions.uiUsersViewLoans.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiOrganizationsViewEditCreate.gui,
      Permissions.uiOrganizationsViewEditDelete.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersDelete.gui,
    ];

    // The five lists the order assertions run on. Their names put them in a known alphabetical
    // order, their "Records" counts are pinned by the query each one is built on (a list that
    // was never refreshed has no records count at all - a "null list"), and "Last updated" is
    // the creation timestamp, so creating them in the order D, A, E, B, C makes all three
    // orders differ from each other.
    const listA = { name: sortedListName('A'), isActive: true, isPrivate: true };
    const listB = { name: sortedListName('B'), isActive: true, isPrivate: true };
    const listC = { name: sortedListName('C'), isActive: false, isPrivate: true };
    const listD = { name: sortedListName('D'), isActive: true, isPrivate: true };
    const listE = { name: sortedListName('E'), isActive: true, isPrivate: true };
    // In creation order, which is the "Last updated" ascending order
    const sortedLists = [listD, listA, listE, listB, listC];

    // Expected row orders. The default "Status" filter hides listC until step #10.
    const byNameAscending = [listA.name, listB.name, listD.name, listE.name];
    const byNameDescending = [listE.name, listD.name, listB.name, listA.name];
    const byRecordsAscending = [listB.name, listD.name, listA.name, listE.name];
    const byRecordsDescending = [listE.name, listA.name, listD.name, listB.name];
    const byLastUpdatedAscending = [listD.name, listA.name, listE.name, listB.name];
    const byLastUpdatedDescending = [listB.name, listE.name, listA.name, listD.name];
    const byLastUpdatedDescendingWithInactive = [listC.name, ...byLastUpdatedDescending];

    const createdListIds = [];

    const createList = (list, { queryId, fqlQuery, fields, entityTypeId } = {}) => {
      return Lists.createViaApi({
        name: list.name,
        description: list.name,
        entityTypeId,
        queryId,
        fqlQuery: fqlQuery ?? '',
        fields,
        isActive: list.isActive,
        isPrivate: list.isPrivate,
      }).then((body) => {
        list.id = body.id;
        createdListIds.push(body.id);
      });
    };

    // A list is only given a records count once it has been refreshed; the two lists built
    // without a query stay "null lists".
    const createAndRefreshList = (list, buildQuery, entityTypeId) => {
      buildQuery().then(({ query, fields }) => {
        Lists.createQueryViaApi(query).then((createdQuery) => {
          createList(list, {
            queryId: createdQuery.queryId,
            fqlQuery: createdQuery.fqlQuery,
            fields,
            entityTypeId,
          }).then(() => {
            Lists.refreshViaApi(list.id);
            Lists.waitForListToCompleteRefreshViaApi(list.id);
            Lists.getListByIdViaApi(list.id).then(({ successRefresh }) => {
              list.recordsCount = successRefresh?.recordsCount;
            });
          });
        });
      });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser(permissions).then((userProperties) => {
        userData = userProperties;
      });

      cy.then(() => {
        cy.getUserToken(userData.username, userData.password);
        Lists.getEntityTypeIdByNameViaApi('Users').then((usersEntityTypeId) => {
          // Filler lists are created first so they are the oldest ones and therefore land at the
          // end of the "Last updated" descending order checked in step #11.
          for (let index = 1; index <= fillerListsCount; index++) {
            createList(
              { name: fillerListName(index), isActive: true, isPrivate: true },
              { entityTypeId: usersEntityTypeId },
            );
          }

          createAndRefreshList(
            listD,
            () => Lists.buildQueryOnActiveUsersWithZeroRecords(),
            usersEntityTypeId,
          );
          createAndRefreshList(
            listA,
            () => Lists.buildQueryOnSingleUserById(userData.userId),
            usersEntityTypeId,
          );
          createAndRefreshList(listE, () => Lists.buildQueryOnActiveUsers(), usersEntityTypeId);
          createList(listB, { entityTypeId: usersEntityTypeId });
          createList(listC, { entityTypeId: usersEntityTypeId });
        });
      });

      // The expected "Records" order only holds if the queries above really produced distinct
      // counts, so fail here rather than with an unexplained row order later on.
      cy.then(() => {
        expect(listD.recordsCount, `"${listD.name}" has no records`).to.equal(0);
        expect(listA.recordsCount, `"${listA.name}" has exactly one record`).to.equal(1);
        expect(listE.recordsCount, `"${listE.name}" has more than one record`).to.be.greaterThan(1);
      });
    });

    beforeEach('Open Lists app', () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.waitLoading();
      Lists.resetAllFilters();
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      cy.wrap(createdListIds).each((id) => Lists.deleteViaApi(id));
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C1434659 Verify sorting in the "Lists" table (athena)',
      { tags: ['extendedPath', 'athena', 'C1434659'] },
      () => {
        // #1 Verify sorting of lists in the "Lists" table
        // Narrow the table down to this test's lists before asserting any order
        Lists.fillInSearchField(sortedListsToken);
        Lists.clickOnSearchButton();
        Lists.verifyLandingPageColumnSortIcon(LIST_NAME, 'ascending');
        Lists.verifyDisplayedListsOrder(byNameAscending);

        // #2 Verify icons displayed next to other columns in the "Lists" table
        Lists.verifyLandingPageColumnSortIcon(RECORDS, 'unsorted');
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'unsorted');
        [RECORD_TYPE, STATUS, SOURCE, VISIBILITY].forEach((column) => {
          Lists.verifyLandingPageColumnIsNotSortable(column);
        });

        // #3 Click "List name" column name in the header of the "Lists" table
        Lists.clickLandingPageColumnHeader(LIST_NAME);
        Lists.verifyLandingPageColumnSortIcon(LIST_NAME, 'descending');
        Lists.verifyDisplayedListsOrder(byNameDescending);

        // #4 Click "List name" column name in the header of the "Lists" table once again
        Lists.clickLandingPageColumnHeader(LIST_NAME);
        Lists.verifyLandingPageColumnSortIcon(LIST_NAME, 'ascending');
        Lists.verifyDisplayedListsOrder(byNameAscending);

        // #5 Click "Records" column name in the header of the "Lists" table
        Lists.clickLandingPageColumnHeader(RECORDS);
        Lists.verifyLandingPageColumnSortIcon(LIST_NAME, 'unsorted');
        Lists.verifyLandingPageColumnSortIcon(RECORDS, 'ascending');
        Lists.verifyDisplayedListsOrder(byRecordsAscending);

        // #6 Reload page by clicking F5
        cy.reload();
        Lists.waitLoading();
        Lists.verifyLandingPageColumnSortIcon(RECORDS, 'ascending');
        // The search term is not kept in the URL, so re-apply it to check this test's lists only
        Lists.fillInSearchField(sortedListsToken);
        Lists.clickOnSearchButton();
        Lists.verifyDisplayedListsOrder(byRecordsAscending);

        // #7 Click "Records" column name in the header of the "Lists" table once again
        Lists.clickLandingPageColumnHeader(RECORDS);
        Lists.verifyLandingPageColumnSortIcon(RECORDS, 'descending');
        Lists.verifyDisplayedListsOrder(byRecordsDescending);

        // #8 Click "Last updated" column name in the header of the "Lists" table
        Lists.clickLandingPageColumnHeader(LAST_UPDATED);
        Lists.verifyLandingPageColumnSortIcon(RECORDS, 'unsorted');
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'ascending');
        Lists.verifyDisplayedListsOrder(byLastUpdatedAscending);

        // #9 Click "Last updated" column name in the header of the "Lists" table once again
        Lists.clickLandingPageColumnHeader(LAST_UPDATED);
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'descending');
        Lists.verifyDisplayedListsOrder(byLastUpdatedDescending);

        // #10 Click "x" icon next to the "Status" accordion under "Search & filter" pane
        Lists.clickOnClearFilterButton(STATUS);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'descending');
        Lists.verifyDisplayedListsOrder(byLastUpdatedDescendingWithInactive);

        // #11 Navigate through the pages of the "Lists" table
        // Five lists fit on a single page, so widen the search to every list this test created
        Lists.fillInSearchField(allListsToken);
        Lists.clickOnSearchButton();
        Lists.verifyListsPaneRecordsCount(fillerListsCount + sortedLists.length);
        Lists.verifyLandingPagePaginationButtonsState({ previous: true, next: false });
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'descending');
        Lists.verifyFirstDisplayedListsOrder(byLastUpdatedDescendingWithInactive);
        Lists.clickLandingPageNextButton();
        Lists.verifyLandingPagePaginationButtonsState({ previous: false, next: true });
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'descending');
        // The oldest list is the only one left for the second page
        Lists.verifyDisplayedListsOrder([fillerListName(1)]);
        Lists.clickLandingPagePreviousButton();
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'descending');
        Lists.verifyFirstDisplayedListsOrder(byLastUpdatedDescendingWithInactive);

        // #12 Click the "Reset all" button
        Lists.resetAllFilters();
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'descending');
        // "Reset all" clears the search box as well, so re-apply it. It also brings the "Status"
        // filter back to "Active", which hides the inactive list again.
        Lists.fillInSearchField(sortedListsToken);
        Lists.clickOnSearchButton();
        Lists.verifyDisplayedListsOrder(byLastUpdatedDescending);
      },
    );
  });
});
