import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const localAuthFile = {
        name: `C436840 auth source file active ${randomPostfix}`,
        prefix: getRandomLetters(6),
        hridStartsWithNumber: '1',
        baseUrl: '',
        source: 'Local',
        isActive: true,
        createdByAdmin: `${date} by ADMINISTRATOR, Diku_admin`,
      };
      const newHridStartsWith = ['787', '100', '9'];
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
              localAuthFile.hridStartsWithNumber,
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
        'C436840 Edit "HRID starts with" field of Local "Authority file" which does not have assigned "MARC authority" records (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          // 1 Go to "Settings" app >> "MARC authority" >> "Manage authority files"
          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitLoading,
          });
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkAuthorityFilesTableExists();
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.hridStartsWithNumber,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            localAuthFile.createdByAdmin,
            true,
          );

          // 2 Click on the "Edit" (pencil) icon of "Local" authority file
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.checkRowEditableInEditMode(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.hridStartsWithNumber,
            localAuthFile.baseUrl,
            localAuthFile.source,
            localAuthFile.createdByAdmin,
          );
          ManageAuthorityFiles.checkNewButtonEnabled(false);

          // Steps 3 - 6
          newHridStartsWith.forEach((hridStartsWith) => {
            ManageAuthorityFiles.editField(localAuthFile.name, 'HRID starts with', hridStartsWith);
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
            ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
            ManageAuthorityFiles.checkSourceFileExists(
              localAuthFile.name,
              localAuthFile.prefix,
              hridStartsWith,
              localAuthFile.baseUrl,
              localAuthFile.isActive,
              `${date} by ${user.lastName}, ${user.firstName}`,
              true,
            );
          });
        },
      );
    });
  });
});
