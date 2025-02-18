import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Users', () => {
  describe('Search (Users)', () => {
    const testData = {
      user: {},
      searchUser1: {
        email: `test@${getRandomPostfix()}folio.org`,
      },
      searchUser2: {
        email: `test@${getRandomPostfix()}folio.org`,
      },
    };

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        cy.createTempUser([Permissions.uiUsersView.gui]).then((userProperties) => {
          testData.user = userProperties;
        });
        cy.createTempUser([], 'staff', 'patron', true, testData.searchUser1.email).then((userProperties) => {
          testData.searchUser1 = { ...testData.searchUser1, ...userProperties };
        });
        cy.createTempUser([], 'staff', 'patron', true, testData.searchUser2.email).then((userProperties) => {
          testData.searchUser2 = { ...testData.searchUser2, ...userProperties };
        });
      });
    });

    beforeEach('Login to the system', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading
      });
    });


    after('Deleting created users', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Users.deleteViaApi(testData.searchUser1.userId);
      Users.deleteViaApi(testData.searchUser2.userId);
    });

    it('C416 Search: Verify search by Email (volaris)',
      { tags: ['criticalPath', 'volaris', 'C416'] },
      () => {
        UsersSearchPane.searchByKeywords(testData.searchUser1.email);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(
          testData.searchUser1.barcode,
          testData.searchUser1.username,
          testData.searchUser1.email,
        );
        UsersSearchResultsPane.verifyUserIsNotPresentInTheList(
          testData.searchUser2.barcode,
          testData.searchUser2.username,
          testData.searchUser2.email,
        );
        UsersSearchPane.resetAllFilters();

        UsersSearchPane.searchByKeywords(testData.searchUser2.email);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(
          testData.searchUser2.barcode,
          testData.searchUser2.username,
          testData.searchUser2.email,
        );
        UsersSearchResultsPane.verifyUserIsNotPresentInTheList(
          testData.searchUser1.barcode,
          testData.searchUser1.username,
          testData.searchUser1.email,
        );
      });

    it('C417 Search: Verify search by barcode (volaris)',
      { tags: ['criticalPath', 'volaris', 'C417'] },
      () => {
        UsersSearchPane.searchByKeywords(testData.searchUser1.barcode);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(
          testData.searchUser1.barcode,
          testData.searchUser1.username,
          testData.searchUser1.email,
        );
        UsersSearchResultsPane.verifyUserIsNotPresentInTheList(
          testData.searchUser2.barcode,
          testData.searchUser2.username,
          testData.searchUser2.email,
        );
        UsersSearchPane.resetAllFilters();

        UsersSearchPane.searchByKeywords(testData.searchUser2.barcode);
        UsersSearchResultsPane.verifyUserIsPresentInTheList(
          testData.searchUser2.barcode,
          testData.searchUser2.username,
          testData.searchUser2.email,
        );
        UsersSearchResultsPane.verifyUserIsNotPresentInTheList(
          testData.searchUser1.barcode,
          testData.searchUser1.username,
          testData.searchUser1.email,
        );
      });
  });
});
