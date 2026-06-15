import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_SOURCES, APPLICATION_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      const randomLetters = getRandomLetters(20);
      const randomNumber = randomNDigitNumber(3);
      const testData = {
        localFileName: `AT_C422256 Local source ${getRandomPostfix()}`,
        prefix: randomLetters,
        startsWith: `1${randomNumber}`,
        isActive: true,
        baseUrl: `https://c422256/${randomLetters}${randomNumber}/`,
        manageAuthorityFilesTab: 'Manage authority files',
      };

      let testUser;

      before('Create test data', () => {
        cy.getAdminToken();

        cy.getAdminSourceRecord().then((record) => {
          testData.adminSourceRecord = record;
        });

        cy.createAuthoritySourceFileUsingAPI(
          testData.prefix,
          testData.startsWith,
          testData.localFileName,
          testData.isActive,
          testData.baseUrl,
        ).then((sourceId) => {
          testData.sourceFileId = sourceId;
        });

        cy.createTempUser([Permissions.uiSettingsViewAuthorityFiles.gui]).then((userProperties) => {
          testUser = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testUser.userId);
        cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId);
      });

      it(
        'C422256 View "Manage authority files" pane in "Settings >> MARC authority" with view permissions (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422256'] },
        () => {
          cy.login(testUser.username, testUser.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitContentLoading,
          });

          // Steps 1-3: Settings opened, MARC authority pane shown, Manage authority files pane in full-screen
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkAuthorityFilesTableExists();
          ManageAuthorityFiles.verifyTableHeaders();
          ManageAuthorityFiles.checkNewButtonShown(false);

          // Step 4: Table contains default FOLIO authority files and local file
          ManageAuthorityFiles.checkDefaultSourceFilesExist({
            editIconsShown: false,
          });
          ManageAuthorityFiles.checkSourceFileExists(
            testData.localFileName,
            testData.prefix,
            testData.startsWith,
            testData.baseURL,
            testData.isActive,
            testData.adminSourceRecord,
            false,
            AUTHORITY_FILE_SOURCES.LOCAL,
            false,
          );

          // Step 5: Click tooltip in "Active" column and verify tooltip text
          ManageAuthorityFiles.verifyActiveColumnTooltipText();

          // Step 6: Click "X" icon — pane closes, MARC authority pane remains
          ManageAuthorityFiles.closePane();
          SettingsPane.checkTabPresentInSecondPane(
            APPLICATION_NAMES.MARC_AUTHORITY,
            testData.manageAuthorityFilesTab,
          );
        },
      );
    });
  });
});
