import { getTestEntityValue } from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import DateTools from '../../support/utils/dateTools';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';

const convertDateFormat = (dateString) => {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const [month, day, year] = dateString.split('/');

  const monthName = months[parseInt(month, 10) - 1];

  return `${monthName} ${day}, ${year}`;
};
describe('Users', () => {
  const testData = {
    patronGroup: {
      name: getTestEntityValue('PatronGroup'),
      description: 'Patron_group_description',
      offsetDays: 30,
    },
    newUser: {
      personal: {
        lastName: getTestEntityValue('TestUser'),
        email: 'test@folio.org',
      },
      preferredContact: 'Email',
    },
  };

  before('Create test data', () => {
    cy.getAdminToken();
    PatronGroups.createViaApi(
      testData.patronGroup.name,
      testData.patronGroup.description,
      testData.patronGroup.offsetDays,
    ).then((patronGroupResponse) => {
      testData.patronGroup.id = patronGroupResponse;
      cy.createTempUser([Permissions.uiUsersCreate.gui]).then((userProperties) => {
        testData.newUser = userProperties;
        cy.login(testData.newUser.username, testData.newUser.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.newUser.userId);
    PatronGroups.deleteViaApi(testData.patronGroup.id);
  });

  it(
    'C503010 Time format of "Expiration date" field in Users app is correct when derived from patron group expiration date (new user created) (extended, volaris)',
    { tags: ['extendedPath', 'volaris', 'C503010'] },
    () => {
      // Step 1: Click on "Actions" button on Users app main page -> select "New" option
      Users.clickNewButton();
      UserEdit.checkUserCreatePaneOpened();

      // Step 2: Select patron group created in precondition #1 from "Patron group" dropdown
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );

      // Verify "Set expiration date?" popup appears with "Cancel" and "Set" buttons
      const expectedDate = DateTools.getFormattedDate(
        {
          date: DateTools.addDays(testData.patronGroup.offsetDays),
        },
        'MM/DD/YYYY',
      );
      const formattedExpectedDate = convertDateFormat(expectedDate);

      const formattedExpectedDateMMDDYYYY = DateTools.clearPaddingZero(expectedDate);

      UserEdit.verifySetExpirationDatePopup(
        testData.patronGroup.name,
        testData.patronGroup.offsetDays,
        formattedExpectedDate,
      );

      // Step 3: Click "Set" option on "Set expiration date?" popup
      UserEdit.setExpirationDate();
      UserEdit.verifyExpirationDateFieldValue(expectedDate);

      // Step 4: Fill rest required fields on "Create User" page and click "Save & close" button
      UserEdit.fillLastFirstNames(testData.newUser.personal.lastName);
      UserEdit.fillEmailAddress(testData.newUser.personal.email);
      UserEdit.changePreferredContact(testData.newUser.preferredContact);
      UserEdit.saveAndClose();

      // Verify user is created successfully and "Expiration date" label contains date from step #3 in MM/DD/YYYY format
      UsersCard.checkKeyValue('Expiration date', formattedExpectedDateMMDDYYYY);
    },
  );
});
