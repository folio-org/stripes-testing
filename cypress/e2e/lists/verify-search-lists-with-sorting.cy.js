import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Search & filter, sort lists', () => {
    let userData = {};
    const postfix = getRandomPostfix();

    const LIST_NAME = 'List name';
    const RECORDS = 'Records';
    const LAST_UPDATED = 'Last updated';

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

    // List 0 is a system generated list present on the environment by default.
    const cannedSystemList = 'Missing items';

    // Lists 1-5 of the test case. They are created in this order, so their creation timestamps
    // give a known "Last updated" order, and only the two active lists carrying a query end up
    // with a records count - mod-lists never imports contents for an inactive list, so every
    // other list stays a "null list" that sorts first ascending / last descending.
    const list1 = {
      name: `Missing Items Report ${postfix}`,
      description: 'Items missing from shelves since January',
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: true,
    };
    const list2 = {
      name: `missing barcodes ${postfix}`,
      description: 'items without barcode assigned',
      recordType: 'Users',
      fqlQuery: '',
      isActive: false,
      isPrivate: true,
    };
    const list3 = {
      name: `Overdue Loans Q2 ${postfix}`,
      description: 'Loans overdue for more than 30 days',
      recordType: 'Loans',
      fqlQuery: '',
      isActive: false,
      isPrivate: true,
    };
    const list4 = {
      name: `Summer Reading List ${postfix}`,
      description: 'Items tagged for summer reading program',
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: true,
    };
    const list5 = {
      name: `New Users Onboarding ${postfix}`,
      description: 'Users created in the last 7 days',
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: true,
    };
    const createdLists = [list1, list2, list3, list4, list5];

    // Creates a list, then refreshes it so that it gets the records count its query returns.
    const createAndRefreshList = (list, buildQuery) => {
      buildQuery().then(({ query, fields }) => {
        Lists.createQueryViaApi(query).then((createdQuery) => {
          list.queryId = createdQuery.queryId;
          list.fqlQuery = createdQuery.fqlQuery;
          list.fields = fields;
          Lists.createViaApi(list).then((body) => {
            list.id = body.id;
            Lists.refreshViaApi(body.id);
            Lists.waitForListToCompleteRefreshViaApi(body.id);
            Lists.getListByIdViaApi(body.id).then(({ successRefresh }) => {
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
        createAndRefreshList(list1, () => Lists.buildQueryOnSingleUserById(userData.userId));
        Lists.createViaApi(list2).then((body) => {
          list2.id = body.id;
        });
        Lists.createViaApi(list3).then((body) => {
          list3.id = body.id;
        });
        createAndRefreshList(list4, () => Lists.buildQueryOnActiveUsers());
        Lists.createViaApi(list5).then((body) => {
          list5.id = body.id;
        });
      });

      // The expected "Records" order only holds if the two queries really returned different
      // counts, so fail here rather than with an unexplained row order later on.
      cy.then(() => {
        expect(list1.recordsCount, `"${list1.name}" has exactly one record`).to.equal(1);
        expect(list4.recordsCount, `"${list4.name}" has more than one record`).to.be.greaterThan(1);
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
      createdLists.forEach((list) => Lists.deleteViaApi(list.id));
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C1434660 Verify search lists used simultaneously with sorting (athena)',
      { tags: ['extendedPath', 'athena', 'C1434660'] },
      () => {
        // The search terms of this test case ("missing", "ITEMS", "day") are broad, and other
        // Lists tests create shared lists under the very same names, so the result set is not
        // this test's alone. Every step therefore asserts the order of this test's own lists
        // relative to each other and a lower bound on the count, ignoring any foreign row.

        // #1 Search "missing" and sort by "List name" in descending order
        Lists.fillInSearchField('missing');
        Lists.pressEnterInSearchField();
        Lists.clickLandingPageColumnHeader(LIST_NAME);
        Lists.verifySearchFieldValue('missing');
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyLandingPageColumnSortIcon(LIST_NAME, 'descending');
        Lists.verifyDisplayedListsRelativeOrder([list1.name, cannedSystemList]);
        Lists.verifyListsPaneRecordsCountAtLeast(2);

        // #2 Search "ITEMS" and sort by "Records" in ascending order
        Lists.resetAllFilters();
        Lists.fillInSearchField('ITEMS');
        Lists.clickOnSearchButton();
        Lists.clickLandingPageColumnHeader(RECORDS);
        Lists.verifySearchFieldValue('ITEMS');
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyLandingPageColumnSortIcon(RECORDS, 'ascending');
        Lists.verifyListIsPresent(cannedSystemList);
        // The system generated list is left out of the order: its records count is environment
        // data, so where it lands among the lists sorted by "Records" is not ours to pin.
        Lists.verifyDisplayedListsRelativeOrder([list1.name, list4.name]);
        Lists.verifyListsPaneRecordsCountAtLeast(3);

        // #3 Under "Status" check "Inactive"
        Lists.selectInactiveLists();
        Lists.verifyCheckboxChecked('Active');
        Lists.verifyCheckboxChecked('Inactive');
        Lists.verifyLandingPageColumnSortIcon(RECORDS, 'ascending');
        Lists.verifyListIsPresent(cannedSystemList);
        // list2 is inactive, so it never got a records count and sorts among the null lists
        Lists.verifyDisplayedListsRelativeOrder([list2.name, list1.name, list4.name]);
        Lists.verifyListsPaneRecordsCountAtLeast(4);

        // #4 Search "day" and sort by "Last updated" in ascending order
        Lists.resetAllFilters();
        Lists.fillInSearchField('day');
        Lists.clickOnSearchButton();
        Lists.unselectActiveLists();
        Lists.clickLandingPageColumnHeader(LAST_UPDATED);
        Lists.verifySearchFieldValue('day');
        Lists.verifyCheckboxUnchecked('Active');
        Lists.verifyCheckboxUnchecked('Inactive');
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'ascending');
        Lists.verifyDisplayedListsRelativeOrder([list3.name, list5.name]);
        Lists.verifyListsPaneRecordsCountAtLeast(2);

        // #5 Click "Last updated" column name once again
        Lists.clickLandingPageColumnHeader(LAST_UPDATED);
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'descending');
        Lists.verifyDisplayedListsRelativeOrder([list5.name, list3.name]);
        Lists.verifyListsPaneRecordsCountAtLeast(2);

        // #6 Search "Missing", filter by "Source" and sort by "Last updated" in ascending order
        Lists.resetAllFilters();
        Lists.fillInSearchField('Missing');
        Lists.clickOnSearchButton();
        Lists.unselectActiveLists();
        Lists.selectUserGeneratedSource();
        Lists.clickLandingPageColumnHeader(LAST_UPDATED);
        Lists.verifySearchFieldValue('Missing');
        Lists.verifyCheckboxUnchecked('Active');
        Lists.verifyCheckboxChecked('User generated');
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'ascending');
        Lists.verifyDisplayedListsRelativeOrder([list1.name, list2.name]);
        Lists.verifyListsPaneRecordsCountAtLeast(2);

        // #7 Click "Records" column name in the header of the "Lists" table
        Lists.clickLandingPageColumnHeader(RECORDS);
        Lists.verifyLandingPageColumnSortIcon(LAST_UPDATED, 'unsorted');
        Lists.verifyLandingPageColumnSortIcon(RECORDS, 'ascending');
        Lists.verifyDisplayedListsRelativeOrder([list2.name, list1.name]);
        Lists.verifyListsPaneRecordsCountAtLeast(2);

        // #8 Click "List name" column name in the header of the "Lists" table
        Lists.clickLandingPageColumnHeader(LIST_NAME);
        Lists.verifyLandingPageColumnSortIcon(RECORDS, 'unsorted');
        Lists.verifyLandingPageColumnSortIcon(LIST_NAME, 'ascending');
        Lists.verifyDisplayedListsRelativeOrder([list2.name, list1.name]);
        Lists.verifyListsPaneRecordsCountAtLeast(2);
      },
    );
  });
});
