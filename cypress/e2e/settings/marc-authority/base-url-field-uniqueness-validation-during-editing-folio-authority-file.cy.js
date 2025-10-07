import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import {
  DEFAULT_FOLIO_AUTHORITY_FILES,
  AUTHORITY_FILE_TEXT_FIELD_NAMES,
} from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const localAuthorityFile = {
        name: `C440091 auth source file ${getRandomPostfix()}`,
        prefix: getRandomLetters(6),
        startWithNumber: '1',
        baseUrl: `http://testing/field/baseurl/${randomPostfix}/`,
        isActive: false,
      };
      const folioAuthorityFile = {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS,
        prefix: 'D',
        hridStartsWith: '',
        baseUrl: 'https://id.nlm.nih.gov/mesh/',
        isActive: false,
      };
      const nonUniqueBaseUrls = [
        'http://id.loc.gov/authorities/names/',
        'https://id.loc.gov/authorities/names/',
        localAuthorityFile.baseUrl,
        `https://testing/field/baseurl/${randomPostfix}/`,
      ];
      const errorBaseUrlUniqueness = 'Error saving data. Base URL must be unique.';
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthorityFile.prefix,
              localAuthorityFile.startWithNumber,
              localAuthorityFile.name,
              localAuthorityFile.isActive,
              localAuthorityFile.baseUrl,
            ).then((sourceId) => {
              localAuthorityFile.id = sourceId;
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
        cy.deleteAuthoritySourceFileViaAPI(localAuthorityFile.id);
        ManageAuthorityFiles.updateBaseUrlInAuthorityFileViaApi(
          folioAuthorityFile.name,
          folioAuthorityFile.baseUrl,
        );
      });

      it(
        'C440091 Uniqueness "Base URL" field validation during editing Folio "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C440091'] },
        () => {
          nonUniqueBaseUrls.forEach((nonUniqueBaseUrl) => {
            ManageAuthorityFiles.clickEditButton(folioAuthorityFile.name);
            ManageAuthorityFiles.editBaseUrlInFolioFile(folioAuthorityFile.name, nonUniqueBaseUrl);
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(folioAuthorityFile.name);
            ManageAuthorityFiles.checkErrorInField(
              folioAuthorityFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
              errorBaseUrlUniqueness,
            );
            ManageAuthorityFiles.clickCancelButtonAfterEditingFile(folioAuthorityFile.name);
            ManageAuthorityFiles.checkSourceFileExists(
              folioAuthorityFile.name,
              folioAuthorityFile.prefix,
              folioAuthorityFile.hridStartsWith,
              folioAuthorityFile.baseUrl,
              folioAuthorityFile.isActive,
              '',
              false,
            );
          });
        },
      );
    });
  });
});
