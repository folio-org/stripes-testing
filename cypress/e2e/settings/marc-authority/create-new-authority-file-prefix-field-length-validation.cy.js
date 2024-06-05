import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const authorityFiles = [
        {
          name: `C440094 Test file ${getRandomPostfix()}`,
          startWithNumber: '5',
          prefixes: [getRandomLetters(26), getRandomLetters(25)],
          baseUrl: `http://testurl.com/source-${getRandomPostfix()}/`,
          isActive: false,
        },
        {
          name: `C440094 Test file 24 prefix ${getRandomPostfix()}`,
          startWithNumber: '5',
          prefix: getRandomLetters(24),
          baseUrl: `http://testurl.com/source/prefix24-${getRandomPostfix()}/`,
          isActive: false,
        },
      ];
      const errorPrefixLength = 'Error saving data. Prefix cannot be more than 25 characters.';
      let user;

      before('Create user, login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
            });
          });
      });

      after('Delete data, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        authorityFiles.forEach((authorityFile) => {
          ManageAuthorityFiles.deleteAuthoritySourceFileByNameViaApi(authorityFile.name);
        });
      });

      it(
        'C440094 "Prefix" field length validation during creation of new "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          // 1 Click on the "+New" button
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();

          // 2 Fill in editable text boxes with unique valid values, but the "Prefix" field with 26-letter prefix
          ManageAuthorityFiles.fillAllFields(
            authorityFiles[0].name,
            authorityFiles[0].prefixes[0],
            authorityFiles[0].startWithNumber,
            authorityFiles[0].baseUrl,
            authorityFiles[0].isActive,
          );
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();

          // 3 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButton();
          ManageAuthorityFiles.checkErrorInField(
            authorityFiles[0].name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixLength,
          );

          // 4 Delete one letter from "Prefix" field
          ManageAuthorityFiles.editField(
            authorityFiles[0].name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            authorityFiles[0].prefixes[1],
          );

          // 5 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(authorityFiles[0].name);
          ManageAuthorityFiles.checkAfterSave(authorityFiles[0].name);
          ManageAuthorityFiles.checkSourceFileExists(
            authorityFiles[0].name,
            authorityFiles[0].prefixes[1],
            authorityFiles[0].startsWith,
            authorityFiles[0].baseUrl,
            authorityFiles[0].isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );

          // 6 Click on the "+New" button
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();

          // 7 Fill in editable text boxes with unique valid values, but the "Prefix" field with 24-letter prefix
          ManageAuthorityFiles.fillAllFields(
            authorityFiles[1].name,
            authorityFiles[1].prefix,
            authorityFiles[1].startWithNumber,
            authorityFiles[1].baseUrl,
            authorityFiles[1].isActive,
          );
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();

          // 8 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(authorityFiles[1].name);
          ManageAuthorityFiles.checkAfterSave(authorityFiles[1].name);
          ManageAuthorityFiles.checkSourceFileExists(
            authorityFiles[1].name,
            authorityFiles[1].prefix,
            authorityFiles[1].startsWith,
            authorityFiles[1].baseUrl,
            authorityFiles[1].isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );
        },
      );
    });
  });
});
