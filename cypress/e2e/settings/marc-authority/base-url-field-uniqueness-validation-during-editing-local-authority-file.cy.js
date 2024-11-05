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
      const randomPostfixBaseUrl = getRandomPostfix();
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const localAuthorityFiles = [
        {
          name: `C440090 auth source file 1 ${getRandomPostfix()}`,
          prefix: `${getRandomLetters(8)}`,
          hridStartsWith: '1',
          isActive: false,
          baseUrl: `http://test.com/source1_${randomPostfixBaseUrl}/`,
        },
        {
          name: `C440090 auth source file 2 ${getRandomPostfix()}`,
          prefix: `${getRandomLetters(8)}`,
          hridStartsWith: '1',
          isActive: false,
          baseUrl: `http://test.com/source2_${randomPostfixBaseUrl}/`,
        },
      ];
      const nonUniqueBaseUrls = [
        'http://id.loc.gov/authorities/names/',
        'https://id.loc.gov/authorities/names/',
        localAuthorityFiles[1].baseUrl,
        `https://test.com/source2_${randomPostfixBaseUrl}/`,
      ];
      const errorNonUniqueBaseUrl = 'Error saving data. Base URL must be unique.';
      let adminUser;
      const user = {};
      const createdAuthorityIds = [];

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
            localAuthorityFiles.forEach((localAuthorityFile) => {
              cy.createAuthoritySourceFileUsingAPI(
                localAuthorityFile.prefix,
                localAuthorityFile.hridStartsWith,
                localAuthorityFile.name,
                localAuthorityFile.isActive,
                localAuthorityFile.baseUrl,
              ).then((sourceId) => {
                createdAuthorityIds.push(sourceId);
              });
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
        createdAuthorityIds.forEach((createdAuthorityId) => {
          cy.deleteAuthoritySourceFileViaAPI(createdAuthorityId);
        });
      });

      it(
        'C440090 Uniqueness "Base URL" field validation during editing local "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C440090'] },
        () => {
          nonUniqueBaseUrls.forEach((nonUniqueBaseUrl) => {
            ManageAuthorityFiles.clickEditButton(localAuthorityFiles[0].name);
            ManageAuthorityFiles.editField(
              localAuthorityFiles[0].name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
              nonUniqueBaseUrl,
            );
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthorityFiles[0].name);
            ManageAuthorityFiles.checkErrorInField(
              localAuthorityFiles[0].name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
              errorNonUniqueBaseUrl,
            );
            ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthorityFiles[0].name);
            ManageAuthorityFiles.checkSourceFileExists(
              localAuthorityFiles[0].name,
              localAuthorityFiles[0].prefix,
              localAuthorityFiles[0].hridStartsWith,
              localAuthorityFiles[0].baseUrl,
              localAuthorityFiles[0].isActive,
              `${date} by ${adminUser}`,
              true,
            );
          });
        },
      );
    });
  });
});
