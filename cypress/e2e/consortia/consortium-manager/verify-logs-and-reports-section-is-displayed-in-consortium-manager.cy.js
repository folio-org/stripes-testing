import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManagerApp from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    let userData;

    before('Create user', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.createTempUser([Permissions.consortiaSettingsConsortiumManagerView.gui]).then(
        (userProperties) => {
          userData = userProperties;
          cy.login(userData.username, userData.password);
        },
      );
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C552358 Verify "Logs & reports" section is displayed in Consortium manager (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C552358'] },
      () => {
        // Step 1: Click "Consortium manager" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.verifyManagementPane();
        ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

        // Step 2: Select all members
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.waitLoading();
        ConsortiumManagerApp.verifyMembersSelected(1);

        // Step 3: Click "<" button on the right edge of the pane
        ConsortiumManagerApp.toggleManagementPane(false);

        // Step 4: Click ">" button in the top left corner of the header line
        ConsortiumManagerApp.toggleManagementPane(true);
        ConsortiumManagerApp.verifyMembersSelected(1);
        ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();
      },
    );
  });
});
