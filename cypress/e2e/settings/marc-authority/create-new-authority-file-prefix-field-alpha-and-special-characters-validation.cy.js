import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const authorityFile = {
        name: `C440095 Letter prefix test ${getRandomPostfix()}`,
        prefix: '2',
        startWithNumber: '5',
        baseUrl: '',
        isActive: false,
      };
      const invalidPrefixes = ['d2', '2d', '2d3', 'a3a', '$', 'd$', '#g', '@g.', 'a?b'];
      const errorPrefixNonAlphabeticalValue =
        'Error saving data. Prefix can only contain alphabetical values.';
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
        'C440095 "Prefix" field alpha and special characters validation during creation of new "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.fillAllFields(
            authorityFile.name,
            authorityFile.prefix,
            authorityFile.startWithNumber,
            authorityFile.baseUrl,
            authorityFile.isActive,
          );
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(authorityFile.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(authorityFile.name);
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            authorityFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixNonAlphabeticalValue,
          );
          invalidPrefixes.forEach((invalidPrefix) => {
            ManageAuthorityFiles.editField(
              authorityFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
              invalidPrefix,
            );
            ManageAuthorityFiles.checkSaveButtonEnabledInFile(authorityFile.name);
            ManageAuthorityFiles.checkCancelButtonEnabledInFile(authorityFile.name);
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkErrorInField(
              authorityFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
              errorPrefixNonAlphabeticalValue,
            );
          });
        },
      );
    });
  });
});
