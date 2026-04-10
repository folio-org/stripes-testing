import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const newAuthorityFile = {
        name: `C451651 auth file ${randomPostfix}`,
        prefix: getRandomLetters(6),
        startWithNumber: '2',
        // Backslash at the end triggers an unhandled backend error
        baseUrl: 'http://test.com\\',
        isActive: true,
      };
      const genericErrorMessage = 'Error on saving data';
      const user = {};

      before('Create user, login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user.userProperties = userProperties;
          })
          .then(() => {
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
      });

      it(
        'C451651 Generic error shows when not handled error is returned from back-end side during creation of new "Authority file" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C451651'] },
        () => {
          // Step 1: Click "+New", verify new editable row
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();

          // Step 2: Fill all fields with valid values and invalid Base URL (backslash)
          ManageAuthorityFiles.fillAllFields(
            newAuthorityFile.name,
            newAuthorityFile.prefix,
            newAuthorityFile.startWithNumber,
            newAuthorityFile.baseUrl,
            newAuthorityFile.isActive,
          );
          ManageAuthorityFiles.checkSaveButtonEnabled();

          // Step 3: Click Save → generic error toast, create mode still open
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          InteractorsTools.checkCalloutErrorMessage(genericErrorMessage);
          ManageAuthorityFiles.checkNewButtonEnabled(false);
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();
        },
      );
    });
  });
});
