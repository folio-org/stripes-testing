import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const localAuthorityFile = {
        name: `C423377 auth source file active ${getRandomPostfix()}`,
        prefix: `${getRandomLetters(8)}`,
        startWithNumber: '1',
        isActive: true,
      };
      const authorityFilesUnuniquePrefix = [
        {
          name: `C423377 auth source file ${getRandomPostfix()}`,
          prefix: localAuthorityFile.prefix,
          startWithNumber: '5',
          baseUrl: 'http://testurl.com/source',
          isActive: false,
        },
        {
          name: `C423377 auth source file ${getRandomPostfix()}`,
          prefix: 'sj',
          startWithNumber: '5',
          baseUrl: 'http://testurl.com/source',
          isActive: false,
        },
      ];
      const errorPrefixUnique = 'Error saving data. Prefix must be unique.';
      const user = {};

      before('Create user, login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user.userProperties = userProperties;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthorityFile.prefix,
              localAuthorityFile.startWithNumber,
              localAuthorityFile.name,
              localAuthorityFile.isActive,
            ).then((sourceId) => {
              localAuthorityFile.id = sourceId;
            });
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
        'C423377 "Prefix" field uniqueness validation during creation of new "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          authorityFilesUnuniquePrefix.forEach((authorityFileUnuniquePrefix) => {
            ManageAuthorityFiles.clickNewButton();
            ManageAuthorityFiles.verifyEditableRowAdded();
            ManageAuthorityFiles.fillAllFields(
              authorityFileUnuniquePrefix.name,
              authorityFileUnuniquePrefix.prefix,
              authorityFileUnuniquePrefix.startWithNumber,
              authorityFileUnuniquePrefix.baseUrl,
              authorityFileUnuniquePrefix.isActive,
            );
            ManageAuthorityFiles.checkCancelButtonEnabled();
            ManageAuthorityFiles.checkSaveButtonEnabled();
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkErrorInField(
              authorityFileUnuniquePrefix.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
              errorPrefixUnique,
            );
            ManageAuthorityFiles.clickCancelButton();
            ManageAuthorityFiles.checkSourceFileExistsByName(
              authorityFileUnuniquePrefix.name,
              false,
            );
          });
        },
      );
    });
  });
});
