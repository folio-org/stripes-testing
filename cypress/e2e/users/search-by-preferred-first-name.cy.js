import { getTestEntityValue } from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';

describe('Users', () => {
  describe('Search (Users)', () => {
    const testData = {
      user: {},
      firstUserWithPreferredName: {},
      secondUserWithPreferredName: {},
    };

    before('Preconditions', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.uiUsersView.gui]).then((userProperties) => {
        testData.user = userProperties;
      });

      const firstPreferredName = getTestEntityValue('FirstPreferred');
      const firstUser = Users.generateUserModel();
      firstUser.personal.preferredFirstName = firstPreferredName;

      Users.createViaApi(firstUser).then((userProperties) => {
        testData.firstUserWithPreferredName = {
          ...userProperties,
          userId: userProperties.id,
        };
      });

      const secondPreferredName = getTestEntityValue('SecondPreferred');
      const secondUser = Users.generateUserModel();
      secondUser.personal.preferredFirstName = secondPreferredName;

      Users.createViaApi(secondUser).then((userProperties) => {
        testData.secondUserWithPreferredName = {
          ...userProperties,
          userId: userProperties.id,
        };
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Users.deleteViaApi(testData.firstUserWithPreferredName.userId);
      Users.deleteViaApi(testData.secondUserWithPreferredName.userId);
    });

    it(
      'C11097 Search by preferred first name (volaris)',
      { tags: ['extendedPath', 'volaris', 'C11097'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });

        UsersSearchPane.searchByKeywords(testData.firstUserWithPreferredName.preferredFirstName);
        UsersSearchResultsPane.verifySearchResultsForPreferredName(
          testData.firstUserWithPreferredName.preferredFirstName,
          testData.secondUserWithPreferredName.preferredFirstName,
        );

        UsersSearchPane.resetAllFilters();
        UsersSearchResultsPane.verifySearchPaneIsEmpty();
        UsersSearchPane.searchByKeywords(testData.secondUserWithPreferredName.preferredFirstName);
        UsersSearchResultsPane.verifySearchResultsForPreferredName(
          testData.secondUserWithPreferredName.preferredFirstName,
          testData.firstUserWithPreferredName.preferredFirstName,
        );
      },
    );
  });
});
