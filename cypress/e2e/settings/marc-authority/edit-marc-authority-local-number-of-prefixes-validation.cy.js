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
      const errorPrefixRequired = 'Error saving data. Prefix is required.';
      const errorPrefixSingle =
        'Error saving data. Only one prefix is allowed for local authority files.';

      const localAuthFile = {
        name: `C440100 auth source file active ${randomPostfix}`,
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
        'C440100 "Prefix" field number of prefixes validation during editing of Local "Authority file" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C440100'] },
        () => {
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            '',
          );
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(localAuthFile.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(localAuthFile.name);
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixRequired,
          );
          ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthFile.name);

          // 2. Multiple prefixes separated by spaces
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            'n pr qs',
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixSingle,
          );
          ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthFile.name);

          // 3. Multiple prefixes separated by commas
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            'n,qs',
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixSingle,
          );
          ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthFile.name);
        },
      );
    });
  });
});
