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
          localFileName: `AT_C430208 Local source ${getRandomPostfix()}`,
          prefix: getRandomLetters(20),
          startsWith: `3${randomNDigitNumber(3)}`,
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

          // Create user in Central (primary affiliation = Central, logs in directly to Central)
          cy.createTempUser([Permissions.uiSettingsViewAuthorityFiles.gui]).then(
            (userProperties) => {
              testUser = userProperties;
              // Assign Member affiliation with view + CRUD permissions
              cy.affiliateUserToTenant({
                tenantId: Affiliations.College,
                userId: testUser.userId,
                permissions: [
                  Permissions.uiSettingsViewAuthorityFiles.gui,
                  Permissions.uiSettingsManageAuthorityFiles.gui,
                ],
              });
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId);
          Users.deleteViaApi(testUser.userId);
        });

        it(
          'C430208 View "Manage authority files" pane in "Settings >> MARC authority" with view permissions in Central and CRUD permissions in Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C430208'] },
          () => {
            cy.resetTenant();
            cy.login(testUser.username, testUser.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Step 1: Central — view-only, no New button, no edit/delete icons
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkNewButtonShown(false);
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

            // Step 2: Switch active affiliation to Member tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

            // Step 3: Member — table is read-only (Central local file not editable from Member)
            SettingsPane.waitLoading();
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              testData.marcAuthorityTabName,
            );
            SettingsPane.selectSettingsTab(testData.manageAuthFilesOption);
            ManageAuthorityFiles.waitContentLoading();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkNewButtonShown(false);
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
          },
        );
      });
    });
  });
});
