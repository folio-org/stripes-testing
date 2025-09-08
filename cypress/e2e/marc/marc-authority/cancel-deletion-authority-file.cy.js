import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const testData = {
        name: `C436921 Local authority file ${getRandomPostfix()}`,
        prefix: getRandomLetters(8),
        startsWith: '1000',
        baseUrl: `https://autotest-c436921.com/${getRandomPostfix()}/`,
        isActive: true,
      };

      let createdAuthorityFileId;
      let user;

      before('Creating test data', () => {
        cy.createTempUser([
          Permissions.uiSettingsManageAuthorityFiles.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createAuthoritySourceFileUsingAPI(
            testData.prefix,
            testData.startsWith,
            testData.name,
            testData.isActive,
            testData.baseUrl,
          ).then((sourceId) => {
            createdAuthorityFileId = sourceId;
          });

          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitLoading,
          });
        });
      });

      after('Deleting test data', () => {
        cy.getAdminToken();
        if (createdAuthorityFileId) {
          cy.deleteAuthoritySourceFileViaAPI(createdAuthorityFileId, true);
        }
        if (user?.userId) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C436921 Cancel deletion of local "Authority file" from "<Authority file name> will be deleted" pop-up modal (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C436921'] },
        () => {
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkAuthorityFilesTableExists();
          ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);

          ManageAuthorityFiles.clickDeleteButton(testData.name);
          ManageAuthorityFiles.verifyDeleteModal(testData.name);

          ManageAuthorityFiles.clickCancelDeletionButton();

          ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);

          ManageAuthorityFiles.clickDeleteButton(testData.name);
          ManageAuthorityFiles.verifyDeleteModal(testData.name);

          ManageAuthorityFiles.closeDeleteModalWithEscapeKey();

          ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);
        },
      );
    });
  });
});
