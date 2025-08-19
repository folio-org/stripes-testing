import { getTestEntityValue } from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserEdit from '../../support/fragments/users/userEdit';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import DateTools from '../../support/utils/dateTools';

describe('Users', () => {
  let formattedPastDate;
  let formattedFutureDate;
  const testData = {
    user: {},
    patronGroup: {
      name: getTestEntityValue('PatronGroup'),
      description: 'Patron_group_description',
      offsetDays: 365,
      offsetDaysPlusOne: 366,
    },
    todayDate: '',
    pastDate: '',
    futureDate: '',
    user1: {},
    user2: {},
  };

  before('Preconditions: patron group and users', () => {
    cy.getAdminToken().then(() => {
      PatronGroups.createViaApi(
        testData.patronGroup.name,
        testData.patronGroup.description,
        testData.patronGroup.offsetDays,
      ).then((patronGroupId) => {
        testData.patronGroup.id = patronGroupId;

        testData.pastDate = DateTools.getFormattedDate(
          {
            date: DateTools.addDays(-7),
          },
          'MM/DD/YYYY',
        );
        formattedPastDate = DateTools.clearPaddingZero(testData.pastDate);

        testData.futureDate = DateTools.getFormattedDate(
          {
            date: DateTools.addDays(7),
          },
          'MM/DD/YYYY',
        );
        formattedFutureDate = DateTools.clearPaddingZero(testData.futureDate);

        cy.createTempUser([
          Permissions.uiUsersCreate.gui,
          Permissions.uiUserEdit.gui,
          Permissions.uiUsersView.gui,
          Permissions.uiUsersCreateEditRemovePatronGroups.gui,
        ]).then((user) => {
          testData.user = user;

          cy.createTempUser([]).then((user1) => {
            testData.user1 = user1;

            cy.createTempUser([]).then((user2) => {
              testData.user2 = user2;

              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.usersPath,
                waiter: UsersSearchPane.waitLoading,
              });
            });
          });
        });
      });
    });
  });

  after('Cleanup', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Users.deleteViaApi(testData.user1.userId);
    Users.deleteViaApi(testData.user2.userId);
    PatronGroups.deleteViaApi(testData.patronGroup.id);
  });

  it(
    'C692248 Reset expiration date of user (volaris)',
    { tags: ['extendedPath', 'volaris', 'C692248'] },
    () => {
      UsersSearchPane.searchByUsername(testData.user1.username);
      UserEdit.openEdit();
      UserEdit.changeExpirationDate(testData.pastDate);
      UserEdit.saveAndClose();

      UsersSearchPane.searchByUsername(testData.user2.username);
      UserEdit.openEdit();
      UserEdit.changeExpirationDate(testData.futureDate);
      UserEdit.saveAndClose();

      // Step 1: Open details pane for User 1
      UsersSearchPane.searchByUsername(testData.user1.username);
      UsersCard.waitLoading();
      UsersCard.verifyUserDetailsPaneOpen();
      UsersCard.checkKeyValue('Expiration date', formattedPastDate);

      // Step 2: Click "Actions" -> "Edit"
      UserEdit.openEdit();
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );
      UserEdit.cancelResetExpirationDateModal();
      UserEdit.verifyExpirationDateFieldValue(testData.pastDate);
      UserEdit.verifyActiveStatusField('false');
      UserEdit.verifyUserHasExpiredMessage();

      // Step 3: Click on "Reset" button under the "Expiration date" field
      UserEdit.clickResetExpirationDateButton();
      UserEdit.verifyUserWillReactivateMessage();

      // Calculate expected expiration date: today + offset days
      const expectedResetDate = DateTools.getFormattedDate(
        {
          date: DateTools.addDays(testData.patronGroup.offsetDays),
        },
        'MM/DD/YYYY',
      );
      const formattedExpectedResetDate = DateTools.clearPaddingZero(expectedResetDate);

      UserEdit.verifyExpirationDateFieldValue(expectedResetDate);
      UserEdit.verifySaveButtonActive();

      // Step 4: Click "Save & close" button
      UserEdit.saveAndClose();
      UsersCard.waitLoading();
      UsersCard.checkKeyValue('Expiration date', formattedExpectedResetDate);
      UsersCard.checkKeyValue('Status', 'Active');

      // Step 5: Open details pane for User 2
      UsersSearchPane.searchByUsername(testData.user2.username);
      UsersCard.waitLoading();
      UsersCard.verifyUserDetailsPaneOpen();
      UsersCard.checkKeyValue('Expiration date', formattedFutureDate);
      UsersCard.checkKeyValue('Status', 'Active');

      // Step 6: Click "Actions" -> "Edit"
      UserEdit.openEdit();
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );
      UserEdit.cancelResetExpirationDateModal();
      UserEdit.verifyExpirationDateFieldValue(testData.futureDate);
      UserEdit.verifyActiveStatusField('true');

      // Step 7: Click on "Reset" button under the "Expiration date" field
      UserEdit.clickResetExpirationDateButton();
      const expectedFutureResetDate = DateTools.getFormattedDate(
        {
          date: DateTools.addDays(testData.patronGroup.offsetDaysPlusOne, testData.futureDate),
        },
        'MM/DD/YYYY',
      );

      const formattedExpectedFutureResetDate = DateTools.clearPaddingZero(expectedFutureResetDate);
      UserEdit.verifyExpirationDateFieldValue(expectedFutureResetDate);
      UserEdit.verifySaveButtonActive();

      // Step 8: Click "Save & close" button
      UserEdit.saveAndClose();
      UsersCard.waitLoading();
      UsersCard.checkKeyValue('Expiration date', formattedExpectedFutureResetDate);
      UsersCard.checkKeyValue('Status', 'Active');
    },
  );
});
