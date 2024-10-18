import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfixBaseUrl = getRandomPostfix();
      const localAuthorityFile = {
        name: `C440086 auth source file active ${getRandomPostfix()}`,
        prefix: `${getRandomLetters(8)}`,
        startWithNumber: '1',
        isActive: true,
        baseUrl: `http://test.com/source_${randomPostfixBaseUrl}/`,
      };
      const authorityFilesNonUniqueBaseUrl = {
        name: `C440086 Base URL uniqueness validation ${getRandomPostfix()}`,
        prefix: `${getRandomLetters(8)}`,
        startWithNumber: '1',
        baseUrls: [
          'http://id.loc.gov/authorities/names/',
          'https://id.loc.gov/authorities/names/',
          localAuthorityFile.baseUrl,
          `https://test.com/source_${randomPostfixBaseUrl}/`,
        ],
        isActive: true,
      };
      const errorNonUniqueBaseUrl = 'Error saving data. Base URL must be unique.';
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
              localAuthorityFile.baseUrl,
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
        cy.deleteAuthoritySourceFileViaAPI(localAuthorityFile.id);
      });

      it(
        'C440086 Uniqueness "Base URL" field validation during creation of new "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C440086'] },
        () => {
          authorityFilesNonUniqueBaseUrl.baseUrls.forEach((authorityFileNonUniqueBaseUrl) => {
            ManageAuthorityFiles.clickNewButton();
            ManageAuthorityFiles.verifyEditableRowAdded();
            ManageAuthorityFiles.fillAllFields(
              authorityFilesNonUniqueBaseUrl.name,
              authorityFilesNonUniqueBaseUrl.prefix,
              authorityFilesNonUniqueBaseUrl.startWithNumber,
              authorityFileNonUniqueBaseUrl,
              authorityFilesNonUniqueBaseUrl.isActive,
            );
            ManageAuthorityFiles.checkCancelButtonEnabled();
            ManageAuthorityFiles.checkSaveButtonEnabled();
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkErrorInField(
              authorityFilesNonUniqueBaseUrl.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
              errorNonUniqueBaseUrl,
            );
            ManageAuthorityFiles.clickCancelButton();
            ManageAuthorityFiles.checkSourceFileExistsByName(
              authorityFilesNonUniqueBaseUrl.name,
              false,
            );
          });
        },
      );
    });
  });
});
