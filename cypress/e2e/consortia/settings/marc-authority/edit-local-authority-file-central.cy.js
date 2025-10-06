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
        const testData = {
          name: `Local source C436902 ${randomPostfix}`,
          prefix: randomLetters,
          startsWith: '1000',
          baseUrl: `https://testing/central/${randomLetters}${randomNumber}/positivetest/`,
          isActive: true,
          date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
          updatedName: `Local source C436902 Updated by user (all fields) from Central tenant ${randomPostfix}`,
          updatedPrefix: `${randomLetters}upd`,
          updatedStartsWith: '333333',
          updatedBaseUrl: `https://testing/central/${randomLetters}${randomNumber}/positivetest1/`,
          updatedIsActive: false,
        };

        before('Create users, login', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createAuthoritySourceFileUsingAPI(
            testData.prefix,
            testData.startsWith,
            testData.name,
            testData.isActive,
            testData.baseUrl,
          ).then((sourceId) => {
            testData.sourceFileId = sourceId;
          });

          cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
            (userProperties) => {
              testData.user = userProperties;
              cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.user.userId, [
                Permissions.uiSettingsViewAuthorityFiles.gui,
              ]);
              cy.waitForAuthRefresh(() => {
                cy.login(testData.user.username, testData.user.password, {
                  path: TopMenu.settingsPath,
                  waiter: SettingsPane.waitLoading,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                SettingsPane.selectSettingsTab('MARC authority');
              }, 20_000).then(() => {
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                SettingsPane.selectSettingsTab('Manage authority files');
                ManageAuthorityFiles.waitLoading();
              });
            },
          );
        });

        after('Delete data, users', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId);
        });

        it(
          'C436902 Edit all editable fields of Local "Authority file" which doesn\'t have assigned "MARC authority" records, from Central tenant (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C436902'] },
          () => {
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExists(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              testData.date, // TO DO: update when MODELINKS-244 is done to `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`
              true,
            );

            ManageAuthorityFiles.clickEditButton(testData.name);
            ManageAuthorityFiles.checkRowEditableInEditMode(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              AUTHORITY_FILE_SOURCES.LOCAL,
              testData.date, // TO DO: update when MODELINKS-244 is done to `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`
              false,
              true,
              true,
            );
            ManageAuthorityFiles.checkNewButtonEnabled(false);

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
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(testData.updatedName);
            ManageAuthorityFiles.checkAfterSaveEditedFile(testData.updatedName);
            ManageAuthorityFiles.checkSourceFileExists(
              testData.updatedName,
              testData.updatedPrefix,
              testData.updatedStartsWith,
              testData.updatedBaseUrl,
              testData.updatedIsActive,
              testData.date, // TO DO: update when MODELINKS-244 is done to `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`
              true,
              true,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab('MARC authority');
            SettingsPane.selectSettingsTab('Manage authority files');
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExists(
              testData.updatedName,
              testData.updatedPrefix,
              testData.updatedStartsWith,
              testData.updatedBaseUrl,
              testData.updatedIsActive,
              testData.date, // TO DO: update when MODELINKS-244 is done to `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`
              false,
              false,
            );
          },
        );
      });
    });
  });
});
