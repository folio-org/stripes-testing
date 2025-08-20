import { getTestEntityValue } from '../../support/utils/stringTools';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UserEdit from '../../support/fragments/users/userEdit';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import UsersCard from '../../support/fragments/users/usersCard';

describe('Users', () => {
  const testData = {
    user: {},
    patronGroup: {
      name: getTestEntityValue('PatronGroup'),
      description: 'Patron_group_description',
    },
    newUser: {
      personal: {
        lastName: getTestEntityValue('TestUser'),
        email: 'test@folio.org',
        barcode: `barcode_${getTestEntityValue('TestUser')}`,
        username: `username_${getTestEntityValue('TestUser')}`,
      },
    },
  };

  before('Create test data', () => {
    cy.getAdminToken();
    PatronGroups.createViaApi(testData.patronGroup.name, testData.patronGroup.description).then(
      (patronGroupResponse) => {
        testData.patronGroup.id = patronGroupResponse;
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
    'C503168 Verify "Email Communication Preferences" field on user creation page (volaris)',
    { tags: ['extendedPath', 'volaris', 'C503168'] },
    () => {
      // Step 1: On top right corner click "Action" button ==> select "New" option
      Users.clickNewButton();
      UserEdit.checkUserCreatePaneOpened();

      // Step 2: Fill in the following fields with appropriate values
      UserEdit.changeLastName(testData.newUser.personal.lastName);
      UserEdit.changePatronGroup(
        `${testData.patronGroup.name} (${testData.patronGroup.description})`,
      );
      UserEdit.setExpirationDate();
      UserEdit.changeBarcode(testData.newUser.personal.barcode);
      UserEdit.changeUserType('Patron');
      UserEdit.changeUsername(testData.newUser.personal.username);
      UserEdit.fillEmailAddress(testData.newUser.personal.email);

      // Verify mentioned fields are populated
      UserEdit.verifyRequiredFieldsFilled(
        testData.newUser.personal.lastName,
        testData.newUser.personal.barcode,
        testData.newUser.personal.username,
        testData.newUser.personal.email,
      );

      // Step 3: Scroll down to the "Contact information"  Verify "Preferred email communications" field is present in "Contact information" accordion
      UserEdit.verifyEmailCommunicationPreferencesField();

      // Step 4: On "Preferred email communications" click on field dropdown ==> Select "Programs" from dropdown
      UserEdit.selectEmailCommunicationPreference('Programs');
      UserEdit.verifyEmailCommunicationPreferenceSelected(['Programs']);
      UserEdit.verifyRemoveButtonExists('Programs');

      // Step 5: Start typing the name of any existing value in "Preferred email communications" dropdown (e.g. "Services")
      UserEdit.typeInEmailCommunicationPreferences('Services');
      UserEdit.verifyEmailCommunicationPreferencesDropdownItemExists('Services');

      // Step 6: Click on the name of item typed in step #5
      UserEdit.selectEmailCommunicationPreference('Services');
      UserEdit.verifyEmailCommunicationPreferenceSelected(['Programs', 'Services']);

      // Step 7: Click on "X" button displayed next to the any value selected in "Preferred email communications" field (e.g. "Programs")
      UserEdit.removeEmailCommunicationPreference('Programs');
      UserEdit.verifyEmailCommunicationPreferenceSelected(['Services']);

      // Step 8: Start typing the name of the third existing value in "Preferred email communications" dropdown (e.g. "Support")
      UserEdit.typeInEmailCommunicationPreferences('Support');
      UserEdit.verifyEmailCommunicationPreferencesDropdownItemExists('Support');

      // Step 9: Press "Enter" button on keyboard after typing full name of item
      UserEdit.pressEnter();
      UserEdit.verifyEmailCommunicationPreferenceSelected(['Services', 'Support']);

      // Step 10: Click on "Save & close" button
      UserEdit.saveAndCloseStayOnEdit();
      UserEdit.closeEditPaneIfExists();

      // Step 11: On 3rd pane look for "Contact information accordion" ==> expand accordion
      UsersCard.waitLoading();
      UsersCard.openContactInformationAccordion();
      UsersCard.verifyEmailCommunicationPreferencesField();
      UsersCard.verifyEmailCommunicationPreferenceSelected(['Services', 'Support']);
      UsersCard.verifyRemovedEmailCommunicationPreference('Programs');
    },
  );
});
