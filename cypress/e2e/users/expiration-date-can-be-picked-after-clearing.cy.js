import { getTestEntityValue } from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UserEdit from '../../support/fragments/users/userEdit';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import UsersCard from '../../support/fragments/users/usersCard';
import DateTools from '../../support/utils/dateTools';

describe('Users', () => {
  const testData = {
    user: {},
    patronGroup: {
      name: getTestEntityValue('PatronGroup'),
      description: 'Patron_group_description',
      expirationDateOffset: '30',
    },
    newUser: {
      personal: {
        lastName: getTestEntityValue('TestUser'),
        email: 'test@folio.org',
        username: `username_${getTestEntityValue('TestUser')}`,
      },
    },
  };

  before('Create test data', () => {
    cy.getAdminToken();

    PatronGroups.createViaApi(testData.patronGroup.name, testData.patronGroup.description).then(
      (patronGroupId) => {
        testData.patronGroup.id = patronGroupId;

        cy.createTempUser([Permissions.uiUsersCreate.gui]).then((userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    PatronGroups.deleteViaApi(testData.patronGroup.id);
  });

  it(
    'C503212 Date in "Expiration date" field can be picked after clearing the field with "x" icon on user create page (extended, volaris)',
    { tags: ['extendedPath', 'volaris', 'C503212'] },
    () => {
      // Step 1: Click "Actions" -> "New" on users app main page
      Users.clickNewButton();
      UserEdit.checkUserCreatePaneOpened();

      // Step 2: Fill in the following fields
      UserEdit.changeLastName(testData.newUser.personal.lastName);
      UserEdit.changeUserType('Patron');
      UserEdit.changeUsername(testData.newUser.personal.username);
      UserEdit.fillEmailAddress(testData.newUser.personal.email);
      UserEdit.verifyLastNameFieldValue(testData.newUser.personal.lastName);
      UserEdit.verifyUsernameFieldValue(testData.newUser.personal.username);
      UserEdit.verifyEmailFieldValue(testData.newUser.personal.email);
      UserEdit.verifyUserTypeFieldValue('patron');

      // Step 3: Select patron group from precondition #1 from "Patron group" dropdown
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );
      UserEdit.setExpirationDate();

      // Verify "Expiration date" field is populated with date in MM/DD/YYYY format
      const expectedDate = DateTools.getFormattedDate(
        {
          date: DateTools.addDays(testData.patronGroup.expirationDateOffset),
        },
        'DD/MM/YYYY',
      );
      UserEdit.verifyExpirationDateFieldValue(expectedDate);

      // Step 4: Clear "Expiration date" field by clicking "x" icon
      UserEdit.clearExpirationDateField();

      // Verify "Expiration date" field is cleared
      UserEdit.verifyExpirationDateFieldCleared();

      // Step 5: Click on "Calendar" icon in "Expiration date" field and pick any date in future
      UserEdit.openExpirationDateCalendar();
      const pickedDate = UserEdit.pickFutureDate();

      // Verify datepicker is collapsed and selected date appears in "Expiration date" field
      UserEdit.verifyExpirationDateFieldValue(pickedDate);

      // Step 6: Click "Save & close" button on user edit page
      UserEdit.saveAndClose();

      // Verify create user page is closed and new user details pane is displayed
      // UserEdit.verifyCreateUserPageClosed();
      UsersCard.verifyUserDetailsPaneOpen();

      // Verify "Expiration date" field has date set in step #5
      UsersCard.openContactInformationAccordion();
      UsersCard.checkKeyValue('Expiration date', pickedDate);
    },
  );
});
