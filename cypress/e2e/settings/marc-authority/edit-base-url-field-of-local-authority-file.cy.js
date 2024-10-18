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
        name: `C436841 auth source file active ${randomPostfix}`,
        prefix: getRandomLetters(6),
        startWithNumber: '1',
        baseUrl: '',
        newBaseUrlFirst: `http://testing/field/baseurl/positivetest1${getRandomLetters(4)}/`,
        newBaseUrlSecond: `https://testing/field/baseurl/positivetest2${getRandomLetters(4)}/`,
        source: 'Local',
        isActive: true,
      };
      const BASEURL = 'Base URL';
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
              localAuthFile.startWithNumber,
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
        'C436841 Edit "Base URL" field of Local "Authority file" which doesn not have assigned "MARC authority" records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436841'] },
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
            localAuthFile.startsWith,
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
            localAuthFile.startWithNumber,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            localAuthFile.source,
            `${date} by ${adminUser}`,
          );
          ManageAuthorityFiles.checkNewButtonEnabled(false);

          // 3 Update value in editable "Base URL" field with unique valid value which has "http://" protocol, ex.:
          // "Base URL" = "http://testing/field/baseurl/positivetest1"
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            BASEURL,
            localAuthFile.newBaseUrlFirst,
          );

          // 4 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.startWithNumber,
            localAuthFile.newBaseUrlFirst,
            localAuthFile.isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );
          ManageAuthorityFiles.checkEditButtonInRow(localAuthFile.name);

          // 5 Update "Base URL" value of edited "Local" authority file one more time with unique valid value which has "https://" protocol:
          // Click on the "Edit" (pencil) icon of "Local" authority file.
          // Update "Base URL" field = "https://testing/field/baseurl/positivetest2"
          // Click on the "Save" button
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            BASEURL,
            localAuthFile.newBaseUrlSecond,
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.startWithNumber,
            localAuthFile.newBaseUrlSecond,
            localAuthFile.isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );
          ManageAuthorityFiles.checkEditButtonInRow(localAuthFile.name);

          // 6 Delete "Base URL" value of edited "Local" authority file:
          // Click on the "Edit" (pencil) icon of "Local" authority file.
          // Clear "Base URL" field = <must be blank>
          // Click on the "Save" button
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.editField(localAuthFile.name, BASEURL, localAuthFile.baseUrl);
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.startWithNumber,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );
          ManageAuthorityFiles.checkEditButtonInRow(localAuthFile.name);
        },
      );
    });
  });
});
