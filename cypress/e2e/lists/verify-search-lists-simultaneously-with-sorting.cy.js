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
    const suffix = getRandomPostfix();

    const LNAME_TOKEN = `AT1434660lname${suffix}`;
    const RECORDS_TOKEN = `AT1434660records${suffix}`;
    const DAY_TOKEN = `AT1434660day${suffix}`;
    const SRCSORT_TOKEN = `AT1434660srcsort${suffix}`;

    function createList({ name, recordType, fqlQuery, isActive, deactivateAfterRefresh = false }) {
      createdListNames.push(name);
      return Lists.createViaApi({
        name,
        description: `Test list for C1434660 ${suffix}`,
        recordType,
        fqlQuery,
        isActive: deactivateAfterRefresh ? true : isActive,
        isPrivate: true,
      }).then((body) => {
        if (!isActive && !deactivateAfterRefresh) return body;

        return Lists.waitForListToCompleteRefreshViaApi(body.id).then(() => {
          if (!deactivateAfterRefresh) return body;

          return Lists.getListByIdViaApi(body.id).then((freshBody) => {
            return Lists.editViaApi(body.id, { ...freshBody, isActive: false });
          });
        });
      });
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
            Lists.buildQueryOnActiveUsers().then(({ query: activeUsersQuery }) => {
              Lists.buildQueryOnAllInstances().then(({ query: instancesQuery }) => {
                // Group A (Step 1): List name sort, 2 Active lists
                createList({
                  name: `${LNAME_TOKEN}_1`,
                  recordType: 'Users',
                  fqlQuery: zeroRecordsQuery.fqlQuery,
                  isActive: true,
                });
                createList({
                  name: `${LNAME_TOKEN}_2`,
                  recordType: 'Users',
                  fqlQuery: zeroRecordsQuery.fqlQuery,
                  isActive: true,
                });

                // Group B (Steps 2-3): Records sort + Inactive inclusion
                createList({
                  name: `${RECORDS_TOKEN}_zero`,
                  recordType: 'Users',
                  fqlQuery: zeroRecordsQuery.fqlQuery,
                  isActive: true,
                });
                createList({
                  name: `${RECORDS_TOKEN}_active`,
                  recordType: 'Users',
                  fqlQuery: activeUsersQuery.fqlQuery,
                  isActive: true,
                });
                createList({
                  name: `${RECORDS_TOKEN}_instances`,
                  recordType: 'Instances',
                  fqlQuery: instancesQuery.fqlQuery,
                  isActive: true,
                });
                createList({
                  name: `${RECORDS_TOKEN}_inactive`,
                  recordType: 'Users',
                  fqlQuery: activeUsersQuery.fqlQuery,
                  isActive: false,
                  deactivateAfterRefresh: true,
                });

                // Group C (Steps 4-5): Last updated sort, both statuses shown when
                // "Active" is unchecked and "Inactive" stays unchecked
                createList({
                  name: `${DAY_TOKEN}_active`,
                  recordType: 'Users',
                  fqlQuery: zeroRecordsQuery.fqlQuery,
                  isActive: true,
                });
                createList({
                  name: `${DAY_TOKEN}_inactive`,
                  recordType: 'Users',
                  fqlQuery: zeroRecordsQuery.fqlQuery,
                  isActive: false,
                  deactivateAfterRefresh: true,
                });

                // Group D (Steps 6-8): Source filter + combined re-sort
                createList({
                  name: `${SRCSORT_TOKEN}_active`,
                  recordType: 'Users',
                  fqlQuery: zeroRecordsQuery.fqlQuery,
                  isActive: true,
                });
                createList({
                  name: `${SRCSORT_TOKEN}_inactive`,
                  recordType: 'Users',
                  fqlQuery: activeUsersQuery.fqlQuery,
                  isActive: false,
                  deactivateAfterRefresh: true,
                });
              });
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
      'C1434660 Verify search lists used simultaneously with sorting (athena) (TaaS)',
      { tags: ['extendedPath', 'athena', 'C1434660'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Search & sort by List name descending
        Lists.searchListsAndPressEnter(LNAME_TOKEN);
        Lists.clickLandingPageColumnHeader('List name');
        Lists.verifyLandingPageColumnSortDirection('List name', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('List name', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageRowCount(2);
        Lists.verifyListsPaneRecordsFoundSubtitle(2);

        // #2 Reset, search & sort by Records ascending (Active lists only)
        Lists.resetSearchAndFilters();
        Lists.searchLists(RECORDS_TOKEN);
        Lists.clickLandingPageColumnHeader('Records');
        Lists.verifyLandingPageColumnSortDirection('Records', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Records', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageRowCount(3);
        Lists.verifyListsPaneRecordsFoundSubtitle(3);

        // #3 Include Inactive lists too
        Lists.selectInactiveLists();
        Lists.verifyLandingPageColumnValuesSorted('Records', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageRowCount(4);
        Lists.verifyListsPaneRecordsFoundSubtitle(4);

        // #4 Reset, search & sort by Last updated ascending (Active unchecked -> both statuses shown)
        Lists.resetSearchAndFilters();
        Lists.searchLists(DAY_TOKEN);
        Lists.deselectActiveLists();
        Lists.clickLandingPageColumnHeader('Last updated');
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageRowCount(2);
        Lists.verifyListsPaneRecordsFoundSubtitle(2);

        // #5 Click "Last updated" again -> descending
        Lists.clickLandingPageColumnHeader('Last updated');
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.DESCENDING);
        Lists.verifyLandingPageRowCount(2);
        Lists.verifyListsPaneRecordsFoundSubtitle(2);

        // #6 Reset, search, filter by Source & sort by Last updated ascending
        Lists.resetSearchAndFilters();
        Lists.searchLists(SRCSORT_TOKEN);
        Lists.deselectActiveLists();
        Lists.expandFilterAccordion('Source');
        Lists.clickOnCheckbox('User generated');
        Lists.clickLandingPageColumnHeader('Last updated');
        Lists.verifyLandingPageColumnSortDirection('Last updated', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Last updated', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageRowCount(2);
        Lists.verifyListsPaneRecordsFoundSubtitle(2);

        // #7 Click "Records" -> ascending
        Lists.clickLandingPageColumnHeader('Records');
        Lists.verifyLandingPageColumnSortDirection('Records', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('Records', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageRowCount(2);

        // #8 Click "List name" -> ascending
        Lists.clickLandingPageColumnHeader('List name');
        Lists.verifyLandingPageColumnSortDirection('List name', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageColumnValuesSorted('List name', SORT_DIRECTIONS.ASCENDING);
        Lists.verifyLandingPageRowCount(2);
      },
    );
  });
});
