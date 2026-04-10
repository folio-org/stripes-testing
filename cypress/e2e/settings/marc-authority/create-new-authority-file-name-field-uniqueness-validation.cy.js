import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import {
  AUTHORITY_FILE_TEXT_FIELD_NAMES,
  DEFAULT_FOLIO_AUTHORITY_FILES,
} from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomLetters = getRandomLetters(15);
      const localAuthorityFile = {
        name: `C423974 auth source file ${getRandomPostfix()}`,
        prefix: `auto${randomLetters}`,
        startWithNumber: '1',
        isActive: true,
        newPrefix: `new${randomLetters}`,
        newUrl: `https://testurl.com/c426974${randomLetters}/`,
        newStartWithNumber: '3',
      };
      const errorNameUnique = 'Error saving data. Name must be unique.';
      const user = {};

      before('Create user, data, login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user.userProperties = userProperties;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthorityFile.prefix,
              localAuthorityFile.startWithNumber,
              localAuthorityFile.name,
              localAuthorityFile.isActive,
            ).then((sourceId) => {
              localAuthorityFile.id = sourceId;
            });
          })
          .then(() => {
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete data, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        cy.deleteAuthoritySourceFileViaAPI(localAuthorityFile.id);
      });

      it(
        'C423974 Create new "Authority file" with already existing value in "Name" field at "Settings >> MARC authority >> Manage authority files" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423974'] },
        () => {
          // Steps 1-3: Try to save with a name that exists in a FOLIO authority file
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();
          ManageAuthorityFiles.fillAllFields(
            DEFAULT_FOLIO_AUTHORITY_FILES.LC_GENRE_FORM_TERMS,
            localAuthorityFile.newPrefix,
            localAuthorityFile.newStartWithNumber,
            localAuthorityFile.newUrl,
            true,
          );
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            localAuthorityFile.newUrl,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
            errorNameUnique,
          );

          // Step 4: Cancel - verify file was not saved
          ManageAuthorityFiles.clickCancelButton();
          ManageAuthorityFiles.checkSourceFileExistsByName(localAuthorityFile.newUrl, false);

          // Steps 5-7: Try to save with a name that exists in a Local authority file
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();
          ManageAuthorityFiles.fillAllFields(
            localAuthorityFile.name,
            `${localAuthorityFile.newPrefix}a`,
            localAuthorityFile.newStartWithNumber,
            `${localAuthorityFile.newUrl}v2/`,
            true,
          );
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            `${localAuthorityFile.newUrl}v2/`,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
            errorNameUnique,
          );
        },
      );
    });
  });
});
