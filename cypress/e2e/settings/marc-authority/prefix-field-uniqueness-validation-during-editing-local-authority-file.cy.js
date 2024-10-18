import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const localAuthFiles = [
        {
          name: `C436865 auth source file active one ${randomPostfix}`,
          prefix: getRandomLetters(6),
          startWithNumber: '1',
          baseUrl: '',
          source: 'Local',
          isActive: true,
        },
        {
          name: `C436865 auth source file active two ${randomPostfix}`,
          prefix: getRandomLetters(6),
          startWithNumber: '1',
          baseUrl: '',
          source: 'Local',
          isActive: true,
        },
      ];
      const errorPrefixUniqueness = 'Error saving data. Prefix must be unique.';
      let adminUser;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.getAdminSourceRecord().then((record) => {
          adminUser = record;
        });
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            localAuthFiles.forEach((localAuthFile) => {
              cy.createAuthoritySourceFileUsingAPI(
                localAuthFile.prefix,
                localAuthFile.startWithNumber,
                localAuthFile.name,
                localAuthFile.isActive,
              ).then((sourceId) => {
                localAuthFile.id = sourceId;
              });
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
        localAuthFiles.forEach((localAuthFile) => {
          cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id);
        });
      });

      it(
        'C436865 "Prefix" field uniqueness validation during editing of Local "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436865'] },
        () => {
          // 1 Click on the "Edit" (pencil) icon of "Local" authority file.
          ManageAuthorityFiles.clickEditButton(localAuthFiles[0].name);
          ManageAuthorityFiles.checkRowEditableInEditMode(
            localAuthFiles[0].name,
            localAuthFiles[0].prefix,
            localAuthFiles[0].startWithNumber,
            localAuthFiles[0].baseUrl,
            localAuthFiles[0].isActive,
            localAuthFiles[0].source,
            `${date} by ${adminUser}`,
          );
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(localAuthFiles[0].name, false);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(localAuthFiles[0].name);

          // 2 Fill in the "Prefix" field with not unique value (same as existing "Local" authority file has)
          ManageAuthorityFiles.editField(
            localAuthFiles[0].name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            localAuthFiles[1].prefix,
          );
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(localAuthFiles[0].name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(localAuthFiles[0].name);

          // 3 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFiles[0].name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFiles[0].name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixUniqueness,
          );

          // 4 Click on the "Cancel" button
          ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthFiles[0].name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFiles[0].name,
            localAuthFiles[0].prefix,
            localAuthFiles[0].hridStartsWith,
            localAuthFiles[0].baseUrl,
            localAuthFiles[0].isActive,
            `${date} by ${adminUser}`,
            true,
          );

          // 5 Update "Prefix" field of "Local" authority file with not unique value (same as existing "FOLIO" authority file has):
          // Click on the "Edit" (pencil) icon of "Local" authority file
          // Update "Prefix" field = <Same value as existing "FOLIO" authority file has>
          // Click on the "Save" button
          ManageAuthorityFiles.clickEditButton(localAuthFiles[0].name);
          ManageAuthorityFiles.editField(
            localAuthFiles[0].name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            'sj',
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFiles[0].name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFiles[0].name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            errorPrefixUniqueness,
          );
        },
      );
    });
  });
});
