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
        name: `C436842 auth source file ${randomPostfix}`,
        prefix: getRandomLetters(6),
        hridStartsWith: '1',
        baseUrl: '',
        source: 'Local',
        isActive: false,
      };
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
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C436842 Change "Active" checkbox state of Local "Authority file" which does not have assigned "MARC authority" records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436842'] },
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
            false,
            localAuthFile.source,
            `${date} by ${adminUser}`,
          );
          ManageAuthorityFiles.checkNewButtonEnabled(false);

          // 3 Check "Active" checkbox
          ManageAuthorityFiles.switchActiveCheckboxInFile(localAuthFile.name, true);
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(localAuthFile.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(localAuthFile.name);

          // 4 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.startWithNumber,
            localAuthFile.baseUrl,
            true,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );

          // 5 Click on the "Edit" (pencil) icon of "Local" authority file again
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.checkRowEditableInEditMode(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.hridStartsWith,
            localAuthFile.baseUrl,
            true,
            localAuthFile.source,
            `${date} by ${user.lastName}, ${user.firstName}`,
          );
          ManageAuthorityFiles.checkNewButtonEnabled(false);

          // 6 Uncheck "Active" checkbox
          ManageAuthorityFiles.switchActiveCheckboxInFile(localAuthFile.name, false);

          // 7 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.startWithNumber,
            localAuthFile.baseUrl,
            false,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );
        },
      );
    });
  });
});
