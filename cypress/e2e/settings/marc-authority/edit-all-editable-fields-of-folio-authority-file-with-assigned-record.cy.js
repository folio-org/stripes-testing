import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const title = `C436863 Test title ${randomPostfix}`;
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const folioAuthorityFile = {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS,
        prefix: 'sh',
        hridStartsWith: '',
        baseUrl: 'http://id.loc.gov/authorities/subjects/',
      };
      const newBaseUrl = `http://testing/field/baseurl/positivetest7${getRandomLetters(4)}/`;
      const controlNumber = `${randomFourDigitNumber()}`;
      const fields = [{ tag: '100', content: `$a ${title}`, indicators: ['\\', '\\'] }];
      let createdAuthorityId;
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            ManageAuthorityFiles.setAuthorityFileToActiveViaApi(folioAuthorityFile.name);
          })
          .then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              `${folioAuthorityFile.prefix}`,
              `${controlNumber}`,
              fields,
            )
              .then((createdRecordId) => {
                createdAuthorityId = createdRecordId;
              })
              .then(() => {
                ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthorityFile.name);
              });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthorityFile.name);
        ManageAuthorityFiles.updateBaseUrlInAuthorityFileViaApi(
          folioAuthorityFile.name,
          folioAuthorityFile.baseUrl,
        );
      });

      it(
        'C436863 Edit all editable fields of FOLIO "Authority file" which has assigned "MARC authority" records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436863'] },
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

          // 3 Update all editable fields with unique valid value
          // "Base URL" = "http://testing/field/baseurl/positivetest7"
          // Change the state of "Active" checkbox to opposite
          ManageAuthorityFiles.editBaseUrlInFolioFile(folioAuthorityFile.name, newBaseUrl);
          ManageAuthorityFiles.switchActiveCheckboxInFile(folioAuthorityFile.name, true);
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(folioAuthorityFile.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(folioAuthorityFile.name);

          // 4 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(folioAuthorityFile.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(folioAuthorityFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            folioAuthorityFile.name,
            folioAuthorityFile.prefix,
            folioAuthorityFile.startWithNumber,
            newBaseUrl,
            true,
            `${date} by ${user.lastName}, ${user.firstName}`,
            false,
          );
        },
      );
    });
  });
});
