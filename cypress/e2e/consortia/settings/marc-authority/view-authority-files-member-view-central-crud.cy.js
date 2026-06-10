import Permissions from '../../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { AUTHORITY_FILE_SOURCES, APPLICATION_NAMES } from '../../../../support/constants';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const testData = {
          localFileName: `AT_C422259 Local source ${getRandomPostfix()}`,
          prefix: getRandomLetters(20),
          startsWith: `2${randomNDigitNumber(3)}`,
          isActive: true,
          baseURL: '',
          manageAuthFilesOption: 'Manage authority files',
          marcAuthorityTabName: 'MARC authority',
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

          // Create user in Member (primary affiliation = College, logs in directly to Member)
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiSettingsViewAuthorityFiles.gui]).then(
            (userProperties) => {
              testUser = userProperties;
              // Assign Central CRUD permissions (Central affiliation is automatic)
              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testUser.userId, [
                Permissions.uiSettingsManageAuthorityFiles.gui,
              ]);
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId);

          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(testUser.userId);
        });

        it(
          'C422259 View "Manage authority files" pane in "Settings >> MARC authority" with view permissions in Member and CRUD permissions in Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C422259'] },
          () => {
            cy.setTenant(Affiliations.College);
            cy.login(testUser.username, testUser.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitContentLoading,
            });
            // User's primary affiliation is College — lands directly on Member tenant
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Steps 1-3: Settings opened, Manage authority files pane in full-screen
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkNewButtonShown();

            // Step 4: Table contains default FOLIO files (with edit icons) and local file (editable)
            ManageAuthorityFiles.checkDefaultSourceFilesExist({
              editIconsShown: true,
            });
            ManageAuthorityFiles.checkSourceFileExists(
              testData.localFileName,
              testData.prefix,
              testData.startsWith,
              testData.baseURL,
              testData.isActive,
              testData.adminSourceRecord,
              true,
              AUTHORITY_FILE_SOURCES.LOCAL,
              true,
            );

            // Step 5: Click tooltip in "Active" column and verify tooltip text
            ManageAuthorityFiles.verifyActiveColumnTooltipText();

            // Step 6: Switch active affiliation to Central tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Steps 7-8: Navigate to Manage authority files on Central (CRUD)
            SettingsPane.waitLoading();
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              testData.marcAuthorityTabName,
            );
            SettingsPane.selectSettingsTab(testData.manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkNewButtonShown(true);

            // Step 9: Table contains default FOLIO files (edit icons shown) and local file (editable, deletable)
            ManageAuthorityFiles.checkDefaultSourceFilesExist({
              editIconsShown: true,
            });
            ManageAuthorityFiles.checkSourceFileExists(
              testData.localFileName,
              testData.prefix,
              testData.startsWith,
              testData.baseURL,
              testData.isActive,
              testData.adminSourceRecord,
              true,
              AUTHORITY_FILE_SOURCES.LOCAL,
              true,
            );
          },
        );
      });
    });
  });
});
