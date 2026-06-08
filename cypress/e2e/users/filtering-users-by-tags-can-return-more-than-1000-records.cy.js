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
    console.log('testData.tagLabel', testData.tagLabel);
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

      // Step 2: Navigate to the last page and back to the first page of the results list
      UsersSearchResultsPane.goToLastPage();
      UsersSearchResultsPane.verifyPagingText('1101 - 1101');
      UsersSearchResultsPane.goToFirstPage();
      UsersSearchResultsPane.verifyPagingText('1 - 100');

      // Step 3: Click "Reset all" and verify the results pane returns to the correct pane subtitle text
      UsersSearchPane.resetAllFilters();
      UsersSearchResultsPane.verifyEnterSearchCriteriaInPaneHeader();

      // Step 4: Add a search term, search, then remove the search term
      UsersSearchPane.searchByKeywords(testData.commonUserName);
      UsersSearchResultsPane.verifyRecordsFoundInPaneHeader(usersQuantity);
      UsersSearchPane.clearSearchField();
      UsersSearchResultsPane.verifyEnterSearchCriteriaInPaneHeader();

      // Step 5: Select a filter, then unselect it
      UsersSearchPane.selectActiveUsersStatusFilter();
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
