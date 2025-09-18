import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserEdit from '../../support/fragments/users/userEdit';
import DateTools from '../../support/utils/dateTools';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';

describe('Users', () => {
  const testData = {
    user: {},
    pastDate: '',
  };

  before('Create user', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser([Permissions.uiUsersCreate.gui, Permissions.uiUserEdit.gui]).then(
        (user) => {
          testData.user = user;
          testData.pastDate = DateTools.getFormattedDate(
            {
              date: DateTools.addDays(-2),
            },
            'MM/DD/YYYY',
          );
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
            authRefresh: true,
          });
        },
      );
    });
  });

  after('Delete user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C692247 User becomes inactive when expiration date is set to a date in the past (volaris)',
    { tags: ['extendedPath', 'volaris', 'C692247'] },
    () => {
      // Step 1-2: search for active user and open details pane / open edit
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersCard.waitLoading();
      UserEdit.openEdit();

      // Step 3: pick a date in the past from Expiration date field
      UserEdit.changeExpirationDate(testData.pastDate);
      UserEdit.verifyExpirationDateFieldValue(testData.pastDate);
      UserEdit.verifySaveButtonActive();

      // Step 4: click Save & close button
      UserEdit.saveAndClose();
      UsersCard.waitLoading();

      // Verify expiration date field contains the past date / status is changed to Inactive
      const formattedPastDate = DateTools.clearPaddingZero(testData.pastDate);
      UsersCard.checkKeyValue('Expiration date', formattedPastDate);
      UsersCard.checkKeyValue('Status', 'Inactive');

      // Step 5: close user details pane, reset search, and verify user is not found among active users
      UsersCard.close();
      UsersSearchPane.resetAllFilters();
      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.searchByUsername(testData.user.username);

      // Verify that the edited user is not found among active users
      UsersSearchResultsPane.verifySearchPaneIsEmpty();
    },
  );
});
