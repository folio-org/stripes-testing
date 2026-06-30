import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Users', () => {
  // This test must create 1101 users, not 1001, because UI can be
  // broken and allow clicking Next page button indefinitely without loading
  // new records, this behavior cannot be reproduced with 1001 records.
  const usersQuantity = 1101;
  const randomPostfix = getRandomPostfix().replace(/\D/g, '');
  const testData = {
    tagLabel: `at_c844850_${randomPostfix}`.toLowerCase(),
    commonUserName: `AT_C844850_${randomPostfix}`,
  };

  const buildUserBody = (index) => ({
    username: `${testData.commonUserName}_${index}`,
    active: true,
    barcode: uuid(),
    personal: {
      firstName: `AT_C844850_FirstName_${index}`,
      lastName: `${testData.commonUserName}_${index}`,
      email: `AT_C844850_${index}_${randomPostfix}@folio.org`,
      preferredContactTypeId: '002',
    },
    patronGroup: testData.patronGroupId,
    type: 'staff',
    tags: { tagList: [testData.tagLabel] },
  });

  before('Create test data', () => {
    cy.getAdminToken();
    // Create the tag definition so it appears in the "Tags" filter multi-select
    cy.createTagApi({ label: testData.tagLabel, description: 'AT_C844850 tag' }).then((tagId) => {
      testData.tagId = tagId;
    });
    // Resolve a patron group to assign to the created users
    cy.getFirstUserGroupId().then((patronGroup) => {
      testData.patronGroupId = patronGroup.id;
      // Create 1101 users with the same tag assigned to all of them
      Array.from({ length: usersQuantity }, (_, index) => Users.createViaApi(buildUserBody(index)));
    });

    cy.createTempUser([Permissions.uiUsersView.gui, Permissions.uiTagsPermissionAll.gui]).then(
      (userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.bulkDeleteUsersViaApi({
      limit: usersQuantity,
      query: `tags.tagList="${testData.tagLabel}"`,
    });
    cy.deleteTagApi(testData.tagId, true);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C844850 Filtering users by Tags can return more than 1000 records (volaris)',
    { tags: ['extendedPath', 'volaris', 'C844850'] },
    () => {
      // Step 1: Select the tag assigned to 1101 users in the "Tags" filter
      UsersSearchPane.chooseTagOption(testData.tagLabel);
      UsersSearchResultsPane.verifyRecordsFoundInPaneHeader(usersQuantity);

      // Step 2: Navigate to the last page and back to the first page of the results list.
      // Intercept the limit=0 count request that UserSearchContainer issues for large result sets.
      // goToFirstPage() clicks Previous once per page (11 times for 12 pages), and each click
      // triggers its own limit=0 request. The last one may still be in-flight when reset is clicked,
      // writing stale "1,101 records found" back into component state (the race condition).
      UsersSearchResultsPane.goToLastPage();
      UsersSearchResultsPane.verifyPagingText('1101 - 1101');
      cy.intercept('GET', '**/users?*limit=0*').as('userCountRequest');
      UsersSearchResultsPane.goToFirstPage();
      UsersSearchResultsPane.verifyPagingText('1 - 100');

      // Step 3: Click "Reset all" and verify the results pane returns to the correct pane subtitle text.
      // Drain every limit=0 request captured during goToFirstPage — the exact count varies because
      // rapid navigation causes requests to overlap. .all gives the actual captured count; cy.wait
      // pops FIFO and blocks on any response that is still in-flight.
      cy.get('@userCountRequest.all').then((intercepts) => {
        Cypress._.times(intercepts.length, () => cy.wait('@userCountRequest'));
      });
      UsersSearchPane.resetAllFilters();
      UsersSearchResultsPane.verifyEnterSearchCriteriaInPaneHeader();

      // Step 4: Add a search term, search, then remove the search term
      cy.intercept('GET', '**/users?*limit=0*').as('userCountRequest');
      UsersSearchPane.searchByKeywords(testData.commonUserName);
      UsersSearchResultsPane.verifyRecordsFoundInPaneHeader(usersQuantity);
      cy.wait('@userCountRequest');
      UsersSearchPane.clearSearchField();
      UsersSearchResultsPane.verifyEnterSearchCriteriaInPaneHeader();

      // Step 5: Select a filter, then unselect it
      cy.intercept('GET', '**/users?*limit=0*').as('userCountRequest');
      UsersSearchPane.selectActiveUsersStatusFilter();
      cy.wait('@userCountRequest');
      UsersSearchPane.unselectActiveUsersStatusFilter();
      UsersSearchResultsPane.verifyEnterSearchCriteriaInPaneHeader();

      // Step 6: With both a search query and a filter applied, unselect the filter
      UsersSearchPane.searchByKeywords(testData.commonUserName);
      UsersSearchPane.chooseTagOption(testData.tagLabel);
      UsersSearchResultsPane.verifyRecordsFoundInPaneHeader(usersQuantity);
      UsersSearchPane.unselectTagOption();
      UsersSearchResultsPane.verifyRecordsFoundInPaneHeader(usersQuantity);
    },
  );
});
