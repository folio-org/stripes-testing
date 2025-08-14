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
        name: `C442815 Base URL space validation ${getRandomPostfix()}`,
        prefix: `${getRandomLetters(8)}`,
        hridStartsWith: '1',
        isActive: true,
        baseUrl: 'http://testspace.com/',
      };
      const urlsWithSpaces = [
        'http://www.test space.com',
        ' http://www.testspace.com',
        'http://www.testspace.com ',
      ];
      const errorInvalidSpace = 'Error saving data. Base URL cannot contain spaces.';
      const errorInvalidProtocol = 'Error saving data. Base URL must contain a valid protocol.';
      const user = {};
      let adminUser;

      before('Create user, login, authority file', () => {
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
        'C442815 "Base URL" field "space" existence validation during editing "Authority file" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C442815'] },
        () => {
          // 1. Space in the middle
          ManageAuthorityFiles.clickEditButton(localAuthorityFile.name);
          ManageAuthorityFiles.editField(
            localAuthorityFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            urlsWithSpaces[0],
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthorityFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthorityFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            errorInvalidSpace,
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

          // 2. Space at the beginning
          ManageAuthorityFiles.clickEditButton(localAuthorityFile.name);
          ManageAuthorityFiles.editField(
            localAuthorityFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            urlsWithSpaces[1],
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

          // 3. Space at the end
          ManageAuthorityFiles.clickEditButton(localAuthorityFile.name);
          ManageAuthorityFiles.editField(
            localAuthorityFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            urlsWithSpaces[2],
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthorityFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthorityFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            errorInvalidSpace,
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
        },
      );
    });
  });
});
