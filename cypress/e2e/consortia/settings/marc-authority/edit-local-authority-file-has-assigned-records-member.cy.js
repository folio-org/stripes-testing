import Permissions from '../../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DateTools from '../../../../support/utils/dateTools';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import {
  APPLICATION_NAMES,
  AUTHORITY_FILE_TEXT_FIELD_NAMES,
  AUTHORITY_FILE_SOURCES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

const randomPostfix = getRandomPostfix();
const randomLetters = getRandomLetters(7);
const testData = {
  name: `AT_C436909_AuthSourceFile_${randomPostfix}`,
  prefix: randomLetters,
  startsWith: '1000',
  baseUrl: `https://autotest/C436909/${randomPostfix}/`,
  isActive: true,
  date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
  updatedName: `AT_C436909_AuthSourceFile_UPD_${randomPostfix}`,
  updatedPrefix: `${randomLetters}U`,
  updatedStartsWith: '22222',
  updatedBaseUrl: `https://autotest-upd/C436909/${randomPostfix}/`,
  updatedIsActive: false,
};
const marcAuthorityTabName = 'MARC authority';
const manageAuthFilesOption = 'Manage authority files';
const authorityFields = [
  { tag: '100', content: `$a AT_C436909_MarcAuthority_${randomPostfix}`, indicators: ['\\', '\\'] },
];

let user;
let authorityFileId;
let createdAuthorityRecordId;

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        before(
          'Create user, Local authority file, and assign MARC authority record at Central',
          () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C436909_');
            // Try to delete previously created source files, or at least deactivate them
            cy.getAuthoritySourceFileDataViaAPI('AT_C436909_*').then(() => {
              Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
                ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
                cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
              });
            });
            // Create Local authority file
            cy.createAuthoritySourceFileUsingAPI(
              testData.prefix,
              testData.startsWith,
              testData.name,
              testData.isActive,
              testData.baseUrl,
            ).then((sourceId) => {
              authorityFileId = sourceId;
              // Create MARC authority record assigned to the file in Central tenant
              MarcAuthorities.createMarcAuthorityViaAPI(
                testData.prefix,
                testData.startsWith,
                authorityFields,
              ).then((createdRecordId) => {
                createdAuthorityRecordId = createdRecordId;
              });
            });
            // Create user with affiliations and permissions
            cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
              (userProps) => {
                user = userProps;
                cy.assignAffiliationToUser(Affiliations.College, user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.uiSettingsManageAuthorityFiles.gui,
                  Permissions.uiSettingsViewAuthorityFiles.gui,
                ]);
              },
            );
          },
        );

        after('Delete user and authority file', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          MarcAuthorities.deleteViaAPI(createdAuthorityRecordId, true);
          cy.deleteAuthoritySourceFileViaAPI(authorityFileId, true);
        });

        it(
          'C436909 Edit all fields of Local "Authority file" which has assigned "MARC authority" records at Central tenant only, from Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C436909'] },
          () => {
            // Step 1: Go to Manage authority files in Member tenant
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, marcAuthorityTabName);
              SettingsPane.waitLoading();
              cy.reload();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            }, 20_000);
            SettingsPane.waitLoading();
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExists(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              `${testData.date} by`,
            );
            ManageAuthorityFiles.checkEditButtonInRow(testData.name);

            // Step 2: Click Edit, verify all fields editable
            ManageAuthorityFiles.clickEditButton(testData.name);
            ManageAuthorityFiles.checkRowEditableInEditMode(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              AUTHORITY_FILE_SOURCES.LOCAL,
              `${testData.date} by`,
              false,
              true,
            );
            ManageAuthorityFiles.checkNewButtonEnabled(false);

            // Step 3: Update all fields, attempt to save, expect error
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
            ManageAuthorityFiles.checkCancelButtonEnabledInFile(testData.updatedName, true);
            ManageAuthorityFiles.checkSaveButtonEnabledInFile(testData.updatedName, true);
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(testData.updatedName);
            // Expect error toast
            ManageAuthorityFiles.verifyUpdateAssignedSourceFileError(testData.name);
            // Should remain in edit mode with changes
            ManageAuthorityFiles.checkCancelButtonEnabledInFile(testData.updatedName, true);
            ManageAuthorityFiles.checkSaveButtonEnabledInFile(testData.updatedName, true);

            // Step 4: Click Cancel, verify changes not saved
            ManageAuthorityFiles.clickCancelButtonAfterEditingFile(testData.updatedName);
            ManageAuthorityFiles.checkSourceFileExists(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              testData.date,
            );

            // Step 5: Edit again, update only allowed fields, save
            ManageAuthorityFiles.clickEditButton(testData.name);
            ManageAuthorityFiles.editField(
              testData.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
              testData.updatedName,
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
            ManageAuthorityFiles.checkCancelButtonEnabledInFile(testData.updatedName, true);
            ManageAuthorityFiles.checkSaveButtonEnabledInFile(testData.updatedName, true);
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(testData.updatedName);
            ManageAuthorityFiles.checkAfterSaveEditedFile(testData.updatedName);
            ManageAuthorityFiles.checkSourceFileExists(
              testData.updatedName,
              testData.prefix,
              testData.startsWith,
              testData.updatedBaseUrl,
              testData.updatedIsActive,
              `${testData.date} by ${user.lastName}, ${user.firstName}`,
            );

            // Step 6: Switch to Central tenant, verify updated values
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExists(
              testData.updatedName,
              testData.prefix,
              testData.startsWith,
              testData.updatedBaseUrl,
              testData.updatedIsActive,
              `${testData.date} by ${user.lastName}, ${user.firstName}`,
            );
          },
        );
      });
    });
  });
});
