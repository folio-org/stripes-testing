import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const title = `C436853 Test title ${randomPostfix}`;
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const localAuthFile = {
        name: `C436853 auth source file active ${randomPostfix}`,
        prefix: getRandomLetters(6),
        hridStartsWith: '1',
        baseUrl: '',
        source: 'Local',
        isActive: true,
      };
      const newBaseUrls = [
        `http://testing/field/baseurl/positivetest4${getRandomLetters(4)}/`,
        `https://testing/field/baseurl/positivetest5${getRandomLetters(4)}/`,
        '',
        `https://testing/field/baseurl/positivetest6${getRandomLetters(4)}/`,
      ];
      const fields = [{ tag: '100', content: `$a ${title}`, indicators: ['\\', '\\'] }];
      const BASEURL = 'Base URL';
      let adminUser;
      let user;
      let createdAuthorityId;

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
          })
          .then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              localAuthFile.prefix,
              localAuthFile.hridStartsWith,
              fields,
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C436853 Edit "Base URL" field of Local "Authority file" which has assigned "MARC authority" records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436853'] },
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

          // 2 Click on the "Edit" (pencil) icon of "Local" authority file which has assigned "MARC authority" records.
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

          // 3 Update value in editable "Base URL" field with unique valid value, ex.:
          // "Base URL" = "http://testing/field/baseurl/positivetest4"
          ManageAuthorityFiles.editField(localAuthFile.name, BASEURL, newBaseUrls[0]);

          // 4 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.startWithNumber,
            newBaseUrls[0],
            localAuthFile.isActive,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );

          // Steps 5 - 7
          newBaseUrls.slice(1).forEach((newBaseUrl) => {
            ManageAuthorityFiles.clickEditButton(localAuthFile.name);
            ManageAuthorityFiles.editField(localAuthFile.name, BASEURL, newBaseUrl);
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
            ManageAuthorityFiles.checkAfterSaveEditedFile(localAuthFile.name);
            ManageAuthorityFiles.checkSourceFileExists(
              localAuthFile.name,
              localAuthFile.prefix,
              localAuthFile.startWithNumber,
              newBaseUrl,
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
