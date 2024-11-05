import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const authorityFileBlankPrefix = {
        name: `C440096 Test file ${getRandomPostfix()}`,
        prefix: '',
        startWithNumber: '5',
        baseUrl: 'testurl.com/source',
        isActive: false,
      };
      const authorityFileMultiplePrefixes = {
        name: `C440096 Test file ${getRandomPostfix()}`,
        prefix: 'n,qs',
        startWithNumber: '5',
        baseUrl: 'http://testurl.com/source',
        isActive: false,
      };
      const multiplePrefixesSeparatedBySpaces = 'n pr qs';
      const errorPrefixRequired = 'Error saving data. Prefix is required.';
      const errorOnePrefixAllowed =
        'Error saving data. Only one prefix is allowed for local authority files.';
      const user = {};

      before('Create user, login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user.userProperties = userProperties;
          })
          .then(() => {
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
            });
          });
      });

      after('Delete data, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
      });

      it(
        'C440096 "Prefix" field number of prefixes validation during creation of new "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C440096'] },
        () => {
          // 1 Click on the "+New" button
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();

          // 2 Fill in editable text boxes with unique valid values, but don't fill "Prefix" field
          ManageAuthorityFiles.fillAllFields(
            authorityFileBlankPrefix.name,
            authorityFileBlankPrefix.prefix,
            authorityFileBlankPrefix.startWithNumber,
            authorityFileBlankPrefix.baseUrl,
            authorityFileBlankPrefix.isActive,
          );
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(authorityFileBlankPrefix.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(authorityFileBlankPrefix.name);

          // 3 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            authorityFileBlankPrefix.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixRequired,
          );

          // 4 Update the "Prefix" field with multiple prefixes separated by spaces
          ManageAuthorityFiles.editField(
            authorityFileBlankPrefix.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            multiplePrefixesSeparatedBySpaces,
          );
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(authorityFileBlankPrefix.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(authorityFileBlankPrefix.name);

          // 5 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            authorityFileBlankPrefix.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorOnePrefixAllowed,
          );

          // 6 Click on the "Cancel" button
          ManageAuthorityFiles.clickCancelButton();
          ManageAuthorityFiles.checkSourceFileExistsByName(authorityFileBlankPrefix.name, false);

          // 7 Click on the "+New" button
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();

          // 8 Fill in editable text boxes with unique valid values, but fill "Prefix" field with multiple prefixes
          // separated by commas
          ManageAuthorityFiles.fillAllFields(
            authorityFileMultiplePrefixes.name,
            authorityFileMultiplePrefixes.prefix,
            authorityFileMultiplePrefixes.startWithNumber,
            authorityFileMultiplePrefixes.baseUrl,
            authorityFileMultiplePrefixes.isActive,
          );
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(authorityFileMultiplePrefixes.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(authorityFileMultiplePrefixes.name);

          // 9 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            authorityFileMultiplePrefixes.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorOnePrefixAllowed,
          );
        },
      );
    });
  });
});
