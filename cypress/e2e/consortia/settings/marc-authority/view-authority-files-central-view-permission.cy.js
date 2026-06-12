import Permissions from '../../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { AUTHORITY_FILE_SOURCES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const testData = {
          localFileName: `AT_C422258 Local source ${getRandomPostfix()}`,
          prefix: getRandomLetters(20),
          startsWith: `1${randomNDigitNumber(3)}`,
          isActive: true,
          baseURL: '',
        };

        let testUser;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.getAdminSourceRecord().then((record) => {
            testData.adminSourceRecord = record;
          });

          cy.createAuthoritySourceFileUsingAPI(
            testData.prefix,
            testData.startsWith,
            testData.localFileName,
            testData.isActive,
          ).then((sourceId) => {
            testData.sourceFileId = sourceId;
          });

          cy.createTempUser([Permissions.uiSettingsViewAuthorityFiles.gui]).then(
            (userProperties) => {
              testUser = userProperties;
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testUser.userId);
          cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId);
        });

        it(
          'C422258 View "Manage authority files" pane in "Settings >> MARC authority" with view permissions in Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C422258'] },
          () => {
            cy.login(testUser.username, testUser.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Steps 1-3: Settings opened, MARC authority pane shown, Manage authority files pane in full-screen
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.verifyTableHeaders();

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
          },
        );
      });
    });
  });
});
