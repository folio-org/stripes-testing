import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const folioAuthorityFile = {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.THESAURUS_FOR_GRAPHIC_MATERIALS,
        prefix: 'lcgtm,tgm',
        hridStartsWith: '',
        baseUrl: 'http://id.loc.gov/vocabulary/graphicMaterials/',
      };
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
          (userProperties) => {
            user = userProperties;
          },
        );
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        // in case the test fails for any reason, return the 'Active' checkbox to its default state
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthorityFile.name);
      });

      it(
        'C436860 Change "Active" checkbox state of FOLIO "Authority file" which does not have assigned "MARC authority" records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436860'] },
        () => {
          // 1 Go to "Settings" app >> "MARC authority" >> "Manage authority files"
          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitLoading,
            authRefresh: true,
          });
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkAuthorityFilesTableExists();
          ManageAuthorityFiles.checkDefaultSourceFilesExist();

          // 2 Click on the "Edit" (pencil) icon of "Authority file" with source "FOLIO" which doesn't have assigned "MARC authority" records
          ManageAuthorityFiles.clickEditButton(folioAuthorityFile.name);
          ManageAuthorityFiles.checkRowEditableInEditModeInFolioFile(
            folioAuthorityFile.name,
            folioAuthorityFile.prefix,
            folioAuthorityFile.hridStartsWith,
            folioAuthorityFile.baseUrl,
            false,
          );
          ManageAuthorityFiles.checkNewButtonEnabled(false);

          // 3 Check "Active" checkbox
          ManageAuthorityFiles.switchActiveCheckboxInFile(folioAuthorityFile.name, true);
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(folioAuthorityFile.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(folioAuthorityFile.name);

          // 4 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(folioAuthorityFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(folioAuthorityFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            folioAuthorityFile.name,
            folioAuthorityFile.prefix,
            folioAuthorityFile.hridStartsWith,
            folioAuthorityFile.baseUrl,
            true,
            `${date} by ${user.lastName}, ${user.firstName}`,
            false,
          );

          // 5 Click on the "Edit" (pencil) icon of updated "FOLIO" authority file
          ManageAuthorityFiles.clickEditButton(folioAuthorityFile.name);
          ManageAuthorityFiles.checkRowEditableInEditModeInFolioFile(
            folioAuthorityFile.name,
            folioAuthorityFile.prefix,
            folioAuthorityFile.hridStartsWith,
            folioAuthorityFile.baseUrl,
            true,
          );
          ManageAuthorityFiles.checkLastUpdatedByUser(
            folioAuthorityFile.name,
            `${date} by ${user.lastName}, ${user.firstName}`,
          );
          ManageAuthorityFiles.checkNewButtonEnabled(false);

          // 6 Uncheck "Active" checkbox
          ManageAuthorityFiles.switchActiveCheckboxInFile(folioAuthorityFile.name, false);

          // 7 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(folioAuthorityFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(folioAuthorityFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            folioAuthorityFile.name,
            folioAuthorityFile.prefix,
            folioAuthorityFile.hridStartsWith,
            folioAuthorityFile.baseUrl,
            false,
            `${date} by ${user.lastName}, ${user.firstName}`,
            false,
          );
        },
      );
    });
  });
});
