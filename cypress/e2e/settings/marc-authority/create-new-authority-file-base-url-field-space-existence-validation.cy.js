import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const authorityFilesInvalidSpace = {
        name: `C442814 Base URL space validation ${getRandomPostfix()}`,
        prefix: `${getRandomLetters(8)}`,
        startWithNumber: '1',
        baseUrls: [
          'http://www.test space.com',
          ' http://www.testspace.com',
          'http://www.testspace.com ',
        ],
        isActive: true,
      };
      const errorInvalidSpace = 'Error saving data. Base URL cannot contain spaces.';
      const errorInvalidProtocol = 'Error saving data. Base URL must contain a valid protocol.';
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
              authRefresh: true,
            });
          });
      });

      after('Delete data, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
      });

      it(
        'C442814 "Base URL" field "space" existence validation during creation of new "Authority file" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C442814'] },
        () => {
          // 1. Space in the middle
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.fillAllFields(
            authorityFilesInvalidSpace.name,
            authorityFilesInvalidSpace.prefix,
            authorityFilesInvalidSpace.startWithNumber,
            authorityFilesInvalidSpace.baseUrls[0],
            true,
          );
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            authorityFilesInvalidSpace.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            errorInvalidSpace,
          );
          ManageAuthorityFiles.clickCancelButton();
          ManageAuthorityFiles.checkSourceFileExistsByName(authorityFilesInvalidSpace.name, false);

          // 2. Space at the beginning
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.fillAllFields(
            authorityFilesInvalidSpace.name,
            getRandomLetters(3),
            `${Math.floor(Math.random() * 1000)}`,
            authorityFilesInvalidSpace.baseUrls[1],
            true,
          );
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            authorityFilesInvalidSpace.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            errorInvalidProtocol,
          );
          ManageAuthorityFiles.clickCancelButton();
          ManageAuthorityFiles.checkSourceFileExistsByName(authorityFilesInvalidSpace.name, false);

          // 3. Space at the end
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.fillAllFields(
            authorityFilesInvalidSpace.name,
            getRandomLetters(3),
            `${Math.floor(Math.random() * 1000)}`,
            authorityFilesInvalidSpace.baseUrls[2],
            true,
          );
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            authorityFilesInvalidSpace.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            errorInvalidSpace,
          );
          ManageAuthorityFiles.clickCancelButton();
          ManageAuthorityFiles.checkSourceFileExistsByName(authorityFilesInvalidSpace.name, false);
        },
      );
    });
  });
});
