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
      const errorPrefixAlpha = 'Error saving data. Prefix can only contain alphabetical values.';
      const invalidPrefixes = ['2', 'd2', '2d', '2d3', 'a3a', '$', 'd$', '#g', '@g.', 'a?b'];
      const localAuthFile = {
        name: `C440099 auth source file active one ${randomPostfix}`,
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
        'C440099 "Prefix" field alpha and special characters validation during editing of Local "Authority file" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C440099'] },
        () => {
          invalidPrefixes.forEach((prefix) => {
            // Edit Local authority file
            ManageAuthorityFiles.clickEditButton(localAuthFile.name);
            ManageAuthorityFiles.editField(
              localAuthFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
              prefix,
            );
            ManageAuthorityFiles.checkSaveButtonEnabledInFile(localAuthFile.name);
            ManageAuthorityFiles.checkCancelButtonEnabledInFile(localAuthFile.name);
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
            ManageAuthorityFiles.checkErrorInField(
              localAuthFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
              errorPrefixAlpha,
            );
            ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthFile.name);
          });
        },
      );
    });
  });
});
