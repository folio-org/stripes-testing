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
      const localAuthFile = {
        name: `C436864 auth source file ${randomPostfix}`,
        newName: `C436864 auth source file updated ${randomPostfix}`,
        prefix: getRandomLetters(6),
        hridStartsWith: '1',
        baseUrl: '',
        source: 'Local',
        isActive: true,
      };
      const errorEmptyName = 'Please fill this in to continue';
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
            cy.createAuthoritySourceFileUsingAPI(
              localAuthFile.prefix,
              localAuthFile.hridStartsWith,
              localAuthFile.name,
              localAuthFile.isActive,
            ).then((sourceId) => {
              localAuthFile.id = sourceId;
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id);
      });

      it(
        'C436864 Empty "Name" field validation during editing of Local "Authority file" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C436864'] },
        () => {
          // 1 Go to "Settings" app >> "MARC authority" >> "Manage authority files"
          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitLoading,
            authRefresh: true,
          });
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkAuthorityFilesTableExists();
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.hridStartsWith,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            `${date} by ${adminUser}`,
            true,
          );

          // 2 Click on the "Edit" (pencil) icon of "Local" authority file
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.checkRowEditableInEditMode(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.hridStartsWith,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            localAuthFile.source,
            `${date} by ${adminUser}`,
          );
          ManageAuthorityFiles.checkNewButtonEnabled(false);

          // 3 Clear "Name" field
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
            '',
          );

          // 4 Click on the "Save" button → error on empty Name field
          // After clearing name, use prefix to identify the row
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.prefix);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFile.prefix,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
            errorEmptyName,
          );

          // 5 Fill in "Name" field with unique valid value
          ManageAuthorityFiles.editField(
            localAuthFile.prefix,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
            localAuthFile.newName,
          );

          // 6 Click on the "Save" button → success
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.newName);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.newName);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.newName,
            localAuthFile.prefix,
            localAuthFile.hridStartsWith,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );
          ManageAuthorityFiles.checkEditButtonInRow(localAuthFile.newName);
        },
      );
    });
  });
});
