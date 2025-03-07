import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';

describe('Users', () => {
  describe('Search (Users)', () => {
    const testData = {
      user: {},
      searchUser: Users.generateUserModel(),
    };

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        cy.createTempUser([Permissions.uiUsersView.gui]).then((userProperties) => {
          testData.user = userProperties;
        });
        cy.createTempUserParameterized(testData.searchUser, [], { userType: 'patron' }).then(
          (userProperties) => {
            testData.searchUser = { ...testData.searchUser, ...userProperties };
          },
        );
      });
    });

    after('Deleting created users', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Users.deleteViaApi(testData.searchUser.userId);
    });

    it(
      'C350569 Search users by first name, last name, middle name and preferred name (volaris)',
      { tags: ['criticalPath', 'volaris', 'C350569'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });

        const user = testData.searchUser.personal;
        const userFields = [
          `${user.lastName}, ${user.preferredFirstName} (${user.firstName}) ${user.middleName}`,
          user.email,
          testData.searchUser.barcode,
          testData.searchUser.username,
        ];

        // Search by First name
        UsersSearchPane.searchByKeywords(user.firstName);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(...userFields);
        UsersSearchPane.resetAllFilters();

        // Search by Last name
        UsersSearchPane.searchByKeywords(user.lastName);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(...userFields);
        UsersSearchPane.resetAllFilters();

        // Search by Preferred first name
        UsersSearchPane.searchByKeywords(user.preferredFirstName);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(...userFields);
        UsersSearchPane.resetAllFilters();

        // Search by Middle name
        UsersSearchPane.searchByKeywords(user.middleName);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(...userFields);
        UsersSearchPane.resetAllFilters();

        // Search by Last name and First name
        UsersSearchPane.searchByKeywords(`${user.lastName} ${user.firstName}`);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(...userFields);
        UsersSearchPane.resetAllFilters();

        // Search by Preferred first name and Last name
        UsersSearchPane.searchByKeywords(`${user.preferredFirstName} ${user.lastName}`);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(...userFields);
        UsersSearchPane.resetAllFilters();

        // Search by full name
        UsersSearchPane.searchByKeywords(
          `${user.firstName} ${user.preferredFirstName} ${user.middleName} ${user.lastName}`,
        );
        UsersSearchResultsPane.verifyUserIsPresentInTheList(...userFields);
        UsersSearchPane.resetAllFilters();
      },
    );
  });
});
