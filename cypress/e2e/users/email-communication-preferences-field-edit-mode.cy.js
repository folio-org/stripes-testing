import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersCard from '../../support/fragments/users/usersCard';

describe('Users', () => {
  const testData = {
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();

    cy.createTempUser([Permissions.uiUsersCreate.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C496142 Email Communication Preferences Field Edit mode (volaris)',
    { tags: ['extendedPath', 'volaris', 'C496142'] },
    () => {
      // Step 1: Search for user from precondition #1 and open its details pane
      UsersSearchPane.searchByUsername(testData.user.username);
      UsersSearchPane.waitLoading();
      UsersCard.verifyUserDetailsPaneOpen();

      // Step 2: On 3rd pane look for "Contact information accordion" ==> expand accordion
      UsersCard.openContactInformationAccordion();
      UsersCard.verifyEmailCommunicationPreferencesField();
      UsersCard.verifyEmailCommunicationPreferenceSelected(['-']);

      // Step 3: On top right corner click "Action" button ==> Click on "Edit"
      UserEdit.openEdit();
      UserEdit.checkUserEditPaneOpened();

      // Step 4-5: Scroll down to the "Contact information" / Select "Programs" from dropdown
      UserEdit.verifyEmailCommunicationPreferencesField();
      UserEdit.selectEmailCommunicationPreference('Programs');
      UserEdit.verifyEmailCommunicationPreferenceSelected(['Programs']);
      UserEdit.verifyRemoveButtonExists('Programs');

      // Step 6: Start typing the name of any existing value in "Preferred email communications" dropdown (e.g. "Services")
      UserEdit.typeInEmailCommunicationPreferences('Services');
      UserEdit.verifyEmailCommunicationPreferencesDropdownItemExists('Services');

      // Step 7: Click on the name of item typed in step #6
      UserEdit.selectEmailCommunicationPreference('Services');
      UserEdit.verifyEmailCommunicationPreferenceSelected(['Programs', 'Services']);

      // Step 8: Click on "Save & close" button
      UserEdit.saveAndClose();

      // Step 9: On 3rd pane look for "Contact information accordion" ==> expand accordion
      UsersCard.openContactInformationAccordion();
      UsersCard.verifyEmailCommunicationPreferencesField();
      UsersCard.verifyEmailCommunicationPreferenceSelected(['Programs', 'Services']);

      // Step 10: On top right corner click "Action" button ==> Click on "Edit"
      UserEdit.openEdit();
      UserEdit.checkUserEditPaneOpened();

      // Step 11: Scroll down to the "Contact information" ==> expand accordion
      UserEdit.verifyEmailCommunicationPreferencesField();
      UserEdit.verifyEmailCommunicationPreferenceSelected(['Programs', 'Services']);

      // Step 12: Click on "X" button displayed next to the values selected in "Preferred email communications" field (Programs, Services)
      UserEdit.removeEmailCommunicationPreference('Programs');
      UserEdit.removeEmailCommunicationPreference('Services');
      UserEdit.verifyEmailCommunicationPreferenceSelected([]);
      UserEdit.verifySaveButtonEnabled();

      // Step 13: Click on the "Preferred email communications" field ==> Select "Support" ==> Click on "Save & close" button
      UserEdit.selectEmailCommunicationPreference('Support');
      UserEdit.verifyEmailCommunicationPreferenceSelected(['Support']);
      UserEdit.verifySaveButtonEnabled();
      UserEdit.saveAndClose();

      // Step 14: On 3rd pane look for "Contact information accordion" ==> expand accordion
      UsersCard.openContactInformationAccordion();
      UsersCard.verifyEmailCommunicationPreferencesField();
      UsersCard.verifyEmailCommunicationPreferenceSelected(['Support']);
      UsersCard.verifyRemovedEmailCommunicationPreference('Programs');
      UsersCard.verifyRemovedEmailCommunicationPreference('Services');
    },
  );
});
