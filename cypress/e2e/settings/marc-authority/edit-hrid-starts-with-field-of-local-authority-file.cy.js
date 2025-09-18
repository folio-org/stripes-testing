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
      };
      const newHridStartsWith = ['787', '100', '9'];
      const HRID_STARTS_WITH = 'HRID starts with';
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
        { tags: ['criticalPath', 'spitfire', 'C436840'] },
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
            localAuthFile.hridStartsWithNumber,
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
            localAuthFile.hridStartsWithNumber,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            localAuthFile.source,
            `${date} by ${adminUser}`,
          );
          ManageAuthorityFiles.checkNewButtonEnabled(false);

          // 3 Update value in editable "HRID starts with" field with unique valid value, ex.:
          // "HRID starts with" = "787"
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            HRID_STARTS_WITH,
            newHridStartsWith[0],
          );

          // 4 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            newHridStartsWith[0],
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );

          // Steps 5 - 6
          newHridStartsWith.slice(1).forEach((hridStartsWith) => {
            ManageAuthorityFiles.clickEditButton(localAuthFile.name);
            ManageAuthorityFiles.editField(localAuthFile.name, HRID_STARTS_WITH, hridStartsWith);
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
