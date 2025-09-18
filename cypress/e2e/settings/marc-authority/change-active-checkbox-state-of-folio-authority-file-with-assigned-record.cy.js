import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const title = `C436862 Test title ${randomPostfix}`;
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const folioAuthorityFile = {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.FACETED_APPLICATION_OF_SUBJECT_TERMINOLOGY,
        prefix: 'fst',
        hridStartsWith: '',
        baseUrl: 'http://id.worldcat.org/fast/',
      };
      const controlNumber = `${randomFourDigitNumber()}`;
      const fields = [
        { tag: '100', content: `$a ${title}`, indicators: ['\\', '\\'] },
        {
          tag: '010',
          content: `$a ${folioAuthorityFile.prefix}${controlNumber}`,
          indicators: ['\\', '\\'],
        },
      ];
      let user;
      let createdAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            ManageAuthorityFiles.setAuthorityFileToActiveViaApi(
              DEFAULT_FOLIO_AUTHORITY_FILES.FACETED_APPLICATION_OF_SUBJECT_TERMINOLOGY,
            );
          })
          .then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              `${folioAuthorityFile.prefix}`,
              `${controlNumber}`,
              fields,
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;
            });
          })
          .then(() => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(
              DEFAULT_FOLIO_AUTHORITY_FILES.FACETED_APPLICATION_OF_SUBJECT_TERMINOLOGY,
            );
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
      });

      it(
        'C436862 Change "Active" checkbox state of FOLIO "Authority file" which has assigned "MARC authority" records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436862'] },
        () => {
          // 1 Go to "Settings" app >> "MARC authority" >> "Manage authority files"
          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitLoading,
          });
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkAuthorityFilesTableExists();

          // 2 Click on the "Edit" (pencil) icon of "Authority file" with source "FOLIO" which has assigned "MARC authority" records
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

          // 5 Click on the "Edit" (pencil) icon of updated "FOLIO" authority file again
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
