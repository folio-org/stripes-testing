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
      const localAuthorityFile = {
        name: `C440092 Base URL protocol validation ${getRandomPostfix()}`,
        prefix: `${getRandomLetters(8)}`,
        hridStartsWith: '1',
        isActive: false,
        baseUrl: '',
      };
      const invalidBaseUrls = [
        'test.com',
        'httpstest.com',
        'https//test.com',
        'hhttps://test.com',
        'ftp://test.com',
      ];
      const errorInvalidProtocol = 'Error saving data. Base URL must contain a valid protocol.';
      let adminUser;
      const user = {};

      before('Create user, login', () => {
        cy.getAdminToken();
        cy.getAdminSourceRecord().then((record) => {
          adminUser = record;
        });
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user.userProperties = userProperties;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthorityFile.prefix,
              localAuthorityFile.hridStartsWith,
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
        'C440092 "Base URL" field protocol existence validation during editing "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C440092'] },
        () => {
          invalidBaseUrls.forEach((invalidBaseUrl) => {
            ManageAuthorityFiles.clickEditButton(localAuthorityFile.name);
            ManageAuthorityFiles.editField(
              localAuthorityFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
              invalidBaseUrl,
            );
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthorityFile.name);
            ManageAuthorityFiles.checkErrorInField(
              localAuthorityFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
              errorInvalidProtocol,
            );
            ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthorityFile.name);
            ManageAuthorityFiles.checkSourceFileExists(
              localAuthorityFile.name,
              localAuthorityFile.prefix,
              localAuthorityFile.hridStartsWith,
              localAuthorityFile.baseUrl,
              localAuthorityFile.isActive,
              `${date} by ${adminUser}`,
              true,
            );
          });
        },
      );
    });
  });
});
