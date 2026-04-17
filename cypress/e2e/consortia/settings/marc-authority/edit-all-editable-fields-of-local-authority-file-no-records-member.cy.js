import Permissions from '../../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DateTools from '../../../../support/utils/dateTools';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import {
  AUTHORITY_FILE_TEXT_FIELD_NAMES,
  AUTHORITY_FILE_SOURCES,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(7);
        const randomNumber = randomFourDigitNumber();
        const manageAuthFilesOption = 'Manage authority files';
        const testData = {
          name: `Local source C436903 ${randomPostfix}`,
          prefix: randomLetters,
          startsWith: '1000',
          baseUrl: `https://c436903/member/${randomLetters}${randomNumber}/positivetest/`,
          isActive: true,
          date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
          updatedName: `Local source C436903 Updated ${randomPostfix}`,
          updatedPrefix: `${randomLetters}upd`,
          updatedStartsWith: '555555',
          updatedBaseUrl: `https://c436903/member/${randomLetters}${randomNumber}/positivetest1/`,
          updatedIsActive: false,
        };

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.getAdminSourceRecord().then((adminSourceRecord) => {
            testData.adminSourceRecord = adminSourceRecord;
          });

          cy.createAuthoritySourceFileUsingAPI(
            testData.prefix,
            testData.startsWith,
            testData.name,
            testData.isActive,
            testData.baseUrl,
          ).then((sourceId) => {
            testData.sourceFileId = sourceId;

            cy.setTenant(Affiliations.College);
            cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
              (userProperties) => {
                testData.user = userProperties;
                cy.resetTenant();
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiSettingsManageAuthorityFiles.gui,
                ]);
              },
            );
          });
        });

        after('Delete data, users', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C436903 Edit all editable fields of Local "Authority file" which doesn\'t have assigned "MARC authority" records, from Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C436903'] },
          () => {
            // Login directly to Member (College) tenant
            cy.setTenant(Affiliations.College);
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Step 1: Go to Settings > MARC authority > Manage authority files (from Member tenant)
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExists(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              `${testData.date} by ${testData.adminSourceRecord}`,
              true,
              AUTHORITY_FILE_SOURCES.LOCAL,
            );

            // Step 2: Click on the "Edit" (pencil) icon of "Local" authority file
            ManageAuthorityFiles.clickEditButton(testData.name);
            ManageAuthorityFiles.checkRowEditableInEditMode(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              AUTHORITY_FILE_SOURCES.LOCAL,
              `${testData.date} by ${testData.adminSourceRecord}`,
              false,
              true,
              true,
            );
            ManageAuthorityFiles.checkNewButtonEnabled(false);

            // Step 3: Update all editable fields with unique valid values
            ManageAuthorityFiles.editField(
              testData.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
              testData.updatedName,
            );
            ManageAuthorityFiles.editField(
              testData.updatedName,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
              testData.updatedPrefix,
            );
            ManageAuthorityFiles.editField(
              testData.updatedName,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
              testData.updatedStartsWith,
            );
            ManageAuthorityFiles.editField(
              testData.updatedName,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
              testData.updatedBaseUrl,
            );
            ManageAuthorityFiles.switchActiveCheckboxInFile(
              testData.updatedName,
              testData.updatedIsActive,
            );
            ManageAuthorityFiles.checkSaveButtonEnabledInFile(testData.updatedName);
            ManageAuthorityFiles.checkCancelButtonEnabledInFile(testData.updatedName);

            // Step 4: Click on the "Save" button
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(testData.updatedName);
            ManageAuthorityFiles.checkAfterSaveEditedFile(testData.updatedName);
            ManageAuthorityFiles.checkSourceFileExists(
              testData.updatedName,
              testData.updatedPrefix,
              testData.updatedStartsWith,
              testData.updatedBaseUrl,
              testData.updatedIsActive,
              `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`,
              true,
              AUTHORITY_FILE_SOURCES.LOCAL,
            );

            // Step 5: Switch active affiliation to Central tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);

            // Step 6: Go to Settings > MARC authority > Manage authority files at Central tenant
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExists(
              testData.updatedName,
              testData.updatedPrefix,
              testData.updatedStartsWith,
              testData.updatedBaseUrl,
              testData.updatedIsActive,
              `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`,
              true,
              AUTHORITY_FILE_SOURCES.LOCAL,
            );
          },
        );
      });
    });
  });
});
