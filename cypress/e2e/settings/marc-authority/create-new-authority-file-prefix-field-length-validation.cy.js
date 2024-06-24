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
      const authorityFile = {
        name: `C440094 Test file ${getRandomPostfix()}`,
        startWithNumber: '5',
        prefixes: [getRandomLetters(26), getRandomLetters(25)],
        baseUrl: `http://testurl.com/source-${getRandomPostfix()}/`,
        isActive: false,
      };
      const authorityFilePrefix24Letters = {
        name: `C440094 Test file 24 prefix ${getRandomPostfix()}`,
        startWithNumber: '5',
        prefix: getRandomLetters(24),
        baseUrl: `http://testurl.com/source/prefix24-${getRandomPostfix()}/`,
        isActive: false,
      };
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
        ManageAuthorityFiles.deleteAuthoritySourceFileByNameViaApi(authorityFile.name);
        ManageAuthorityFiles.deleteAuthoritySourceFileByNameViaApi(
          authorityFilePrefix24Letters.name,
        );
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
            authorityFile.name,
            authorityFile.prefixes[0],
            authorityFile.startWithNumber,
            authorityFile.baseUrl,
            authorityFile.isActive,
          );
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();

          // 3 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            authorityFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixLength,
          );

          // 4 Delete one letter from "Prefix" field
          ManageAuthorityFiles.editField(
            authorityFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            authorityFile.prefixes[1],
          );

          // 5 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(authorityFile.name);
          ManageAuthorityFiles.checkAfterSaveCreatedFile(authorityFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            authorityFile.name,
            authorityFile.prefixes[1],
            authorityFile.startsWith,
            authorityFile.baseUrl,
            authorityFile.isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );

          // 6 Click on the "+New" button
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();

          // 7 Fill in editable text boxes with unique valid values, but the "Prefix" field with 24-letter prefix
          ManageAuthorityFiles.fillAllFields(
            authorityFilePrefix24Letters.name,
            authorityFilePrefix24Letters.prefix,
            authorityFilePrefix24Letters.startWithNumber,
            authorityFilePrefix24Letters.baseUrl,
            authorityFilePrefix24Letters.isActive,
          );
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();

          // 8 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(authorityFilePrefix24Letters.name);
          ManageAuthorityFiles.checkAfterSaveCreatedFile(authorityFilePrefix24Letters.name);
          ManageAuthorityFiles.checkSourceFileExists(
            authorityFilePrefix24Letters.name,
            authorityFilePrefix24Letters.prefix,
            authorityFilePrefix24Letters.startsWith,
            authorityFilePrefix24Letters.baseUrl,
            authorityFilePrefix24Letters.isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );
        },
      );
    });
  });
});
