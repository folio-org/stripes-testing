import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';

describe('Users', () => {
  describe('Search (Users)', () => {
    const testData = {
      user: {},
      searchUser1: Users.generateUserModel(),
      searchUser2: Users.generateUserModel(),
    };
    testData.searchUser1.externalSystemId = `ExternalId1_${getRandomPostfix()}`;
    testData.searchUser2.externalSystemId = `ExternalId2_${getRandomPostfix()}`;
    const partialExternalId1 = testData.searchUser1.externalSystemId.slice(0, 20);
    const partialExternalId2 = testData.searchUser2.externalSystemId.slice(0, 20);

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        cy.createTempUser([Permissions.uiUsersView.gui]).then((userProperties) => {
          testData.user = userProperties;
        });
        cy.createTempUserParameterized(testData.searchUser1, [], { userType: 'patron' }).then(
          (userProperties) => {
            testData.searchUser1 = { ...testData.searchUser1, ...userProperties };
          },
        );
        cy.createTempUserParameterized(testData.searchUser2, [], { userType: 'patron' }).then(
          (userProperties) => {
            testData.searchUser2 = { ...testData.searchUser2, ...userProperties };
          },
        );
      });
    });

    beforeEach('Login to the system', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });

    after('Deleting created users', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Users.deleteViaApi(testData.searchUser1.userId);
      Users.deleteViaApi(testData.searchUser2.userId);
    });

    it(
      'C418 Search: Verify search by External ID (vega)',
      { tags: ['extendedPath', 'vega', 'C418'] },
      () => {
        // #1 Click on the search option dropdown above the search box on "Search & filter" pane and make sure that "Keyword (name, username, email, identifier, custom fields)" search option is selected
        UsersSearchPane.verifyKeywordSearchOptionSelected();

        // #2 Fill in the search box with full external ID of first user from precondition and click "Search" button
        UsersSearchPane.searchByKeywords(testData.searchUser1.externalSystemId);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(
          testData.searchUser1.barcode,
          testData.searchUser1.username,
          testData.searchUser1.personal.email,
        );
        UsersSearchResultsPane.verifyUserIsNotPresentInTheList(
          testData.searchUser2.barcode,
          testData.searchUser2.username,
          testData.searchUser2.personal.email,
        );

        // #3 Click on "Reset all" button
        UsersSearchPane.resetAllFilters();
        UsersSearchResultsPane.verifySearchPaneIsEmpty();

        // #4 Fill in the search box with full external ID of second user from precondition and click "Search" button
        UsersSearchPane.searchByKeywords(testData.searchUser2.externalSystemId);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(
          testData.searchUser2.barcode,
          testData.searchUser2.username,
          testData.searchUser2.personal.email,
        );
        UsersSearchResultsPane.verifyUserIsNotPresentInTheList(
          testData.searchUser1.barcode,
          testData.searchUser1.username,
          testData.searchUser1.personal.email,
        );

        // #5 Clear the search box
        UsersSearchPane.clearSearchField();
        UsersSearchResultsPane.verifySearchPaneIsEmpty();

        // #6 Fill in the search box with just a part of the first user's external ID and click "Search" button
        UsersSearchPane.searchByKeywords(partialExternalId1);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(
          testData.searchUser1.barcode,
          testData.searchUser1.username,
          testData.searchUser1.personal.email,
        );
        UsersSearchResultsPane.verifyUserIsNotPresentInTheList(
          testData.searchUser2.barcode,
          testData.searchUser2.username,
          testData.searchUser2.personal.email,
        );

        // #7 Click on "Reset all" button and repeat step #6 with a part of the second user's external ID
        UsersSearchPane.resetAllFilters();
        UsersSearchResultsPane.verifySearchPaneIsEmpty();
        UsersSearchPane.searchByKeywords(partialExternalId2);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(
          testData.searchUser2.barcode,
          testData.searchUser2.username,
          testData.searchUser2.personal.email,
        );
        UsersSearchResultsPane.verifyUserIsNotPresentInTheList(
          testData.searchUser1.barcode,
          testData.searchUser1.username,
          testData.searchUser1.personal.email,
        );
      },
    );
  });
});
