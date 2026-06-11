import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';
import {
  AUTHORITY_FILE_SOURCES,
  AUTHORITY_FILE_TEXT_FIELD_NAMES,
} from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(20);
      const randomNumber = randomNDigitNumber(3);
      const testData = {
        name: `AT_C436832 Local source ${randomPostfix}`,
        prefix: randomLetters,
        startsWith: `1${randomNumber}`,
        baseUrl: `https://c436832/${randomLetters}${randomNumber}/`,
        isActive: true,
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        updatedName: `AT_C436832 Local source Updated ${randomPostfix}`,
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
          testData.name,
          testData.isActive,
          testData.baseUrl,
        ).then((sourceId) => {
          testData.sourceFileId = sourceId;
        });

        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
          (userProperties) => {
            testUser = userProperties;
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testUser.userId);
        cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId);
      });

      it(
        'C436832 Edit "Name" field of Local "Authority file" which doesn\'t have assigned "MARC authority" records (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C436832'] },
        () => {
          cy.login(testUser.username, testUser.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitLoading,
            authRefresh: true,
          });

          // Step 1: Click Edit — row becomes editable, Save disabled
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
          );
          ManageAuthorityFiles.checkNewButtonEnabled(false);

          // Step 2: Update "Name" field — Save and Cancel become enabled
          ManageAuthorityFiles.editField(
            testData.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
            testData.updatedName,
          );
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(testData.updatedName, true);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(testData.updatedName, true);

          // Step 3: Click Save — success callout, updated file shown with only Name changed
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(testData.updatedName);
          ManageAuthorityFiles.checkAfterSaveEditedFile(testData.updatedName);
          ManageAuthorityFiles.checkSourceFileExists(
            testData.updatedName,
            testData.prefix,
            testData.startsWith,
            testData.baseUrl,
            testData.isActive,
            '',
            true,
            AUTHORITY_FILE_SOURCES.LOCAL,
          );
        },
      );
    });
  });
});
