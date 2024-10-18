import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const authorityFilesInvalidProtocol = {
        name: `C440088 Base URL protocol validation ${getRandomPostfix()}`,
        prefix: `${getRandomLetters(8)}`,
        startWithNumber: '1',
        baseUrls: [
          'test.com',
          'httpstest.com',
          'https\\\\test.com',
          'hhttps://test.com',
          'ftp://test.com',
        ],
        isActive: true,
      };
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
            });
          });
      });

      after('Delete data, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
      });

      it(
        'C440088 "Base URL" field protocol existence validation during creation of new "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C440088'] },
        () => {
          authorityFilesInvalidProtocol.baseUrls.forEach((baseUrlInvalidProtocol) => {
            ManageAuthorityFiles.clickNewButton();
            ManageAuthorityFiles.fillAllFields(
              authorityFilesInvalidProtocol.name,
              authorityFilesInvalidProtocol.prefix,
              authorityFilesInvalidProtocol.startWithNumber,
              baseUrlInvalidProtocol,
              authorityFilesInvalidProtocol.isActive,
            );
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkErrorInField(
              authorityFilesInvalidProtocol.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
              errorInvalidProtocol,
            );
            ManageAuthorityFiles.clickCancelButton();
            ManageAuthorityFiles.checkSourceFileExistsByName(
              authorityFilesInvalidProtocol.name,
              false,
            );
          });
        },
      );
    });
  });
});
