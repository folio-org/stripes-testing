import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const errorPrefixLength = 'Error saving data. Prefix cannot be more than 25 characters.';

      const localAuthFile = {
        name: `C440098 auth source file active ${randomPostfix}`,
        prefix: getRandomLetters(6),
        startWithNumber: '1',
        baseUrl: '',
        source: 'Local',
        isActive: true,
      };
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthFile.prefix,
              localAuthFile.startWithNumber,
              localAuthFile.name,
              localAuthFile.isActive,
            ).then((sourceId) => {
              localAuthFile.id = sourceId;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id);
      });

      it(
        'C440098 "Prefix" field length validation during editing of Local "Authority file" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C440098'] },
        () => {
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            'abcdefghijklmnopqrstuvwxyz',
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixLength,
          );
          ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthFile.name);

          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            'abcdefghijklmnopqrstuvwxy',
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);

          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            'abcdefghijklmnopqrstuvwx',
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
        },
      );
    });
  });
});
