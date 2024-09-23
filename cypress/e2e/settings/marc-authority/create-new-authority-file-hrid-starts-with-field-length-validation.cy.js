import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const localAuthFileWithInvalidHridStartsWith = {
        name: `C436949 Test file vp 11 digits ${randomPostfix}`,
        prefix: getRandomLetters(3),
        invalidHridStartsWith: '12345678910',
        baseUrl: `http://testurl.com/source4${getRandomPostfix()}`,
        source: 'Local',
        isActive: false,
      };
      const localAuthFilesWithValidHridStartsWith = [
        {
          name: `C436949 Test file vp 10 digits ${randomPostfix}`,
          prefix: getRandomLetters(3),
          validHridStartsWith: '1234567890',
          baseUrl: `http://testurl.com/source4${getRandomPostfix()}/`,
          source: 'Local',
          isActive: false,
        },
        {
          name: `C436949 Test file vp 9 digits ${randomPostfix}`,
          prefix: getRandomLetters(3),
          validHridStartsWith: '123456789',
          baseUrl: `http://testurl.com/source5${getRandomPostfix()}/`,
          source: 'Local',
          isActive: false,
        },
      ];
      const error = 'Error saving data. HRID cannot contain more than 10 characters.';
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user = userProperties;
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
        localAuthFilesWithValidHridStartsWith.forEach((localAuthFileWithValidHridStartsWith) => {
          ManageAuthorityFiles.deleteAuthoritySourceFileByNameViaApi(
            localAuthFileWithValidHridStartsWith.name,
          );
        });
      });

      it(
        'C436949 "HRID starts with" field length validation during creation of new "Authority file" at "Settings >> MARC authority>>Manage authority files" pane (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          // 1 Click on the "+New" button
          // Fill in editable text boxes with unique valid values, but fill "HRID starts with" field with "11-digit valid value"
          // Click on the "Save" button
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.fillAllFields(
            localAuthFileWithInvalidHridStartsWith.name,
            localAuthFileWithInvalidHridStartsWith.prefix,
            localAuthFileWithInvalidHridStartsWith.invalidHridStartsWith,
            localAuthFileWithInvalidHridStartsWith.baseUrl,
            localAuthFileWithInvalidHridStartsWith.isActive,
          );
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            localAuthFileWithInvalidHridStartsWith.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            error,
          );

          // 2 Click on the "Cancel" button
          ManageAuthorityFiles.clickCancelButton();
          ManageAuthorityFiles.checkSourceFileExistsByName(
            localAuthFileWithInvalidHridStartsWith.name,
            false,
          );

          // Steps 3-4
          localAuthFilesWithValidHridStartsWith.forEach((localAuthFileWithValidHridStartsWith) => {
            ManageAuthorityFiles.clickNewButton();
            ManageAuthorityFiles.fillAllFields(
              localAuthFileWithValidHridStartsWith.name,
              localAuthFileWithValidHridStartsWith.prefix,
              localAuthFileWithValidHridStartsWith.validHridStartsWith,
              localAuthFileWithValidHridStartsWith.baseUrl,
              localAuthFileWithValidHridStartsWith.isActive,
            );
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkAfterSaveCreatedFile(
              localAuthFileWithValidHridStartsWith.name,
            );
            ManageAuthorityFiles.checkSourceFileExists(
              localAuthFileWithValidHridStartsWith.name,
              localAuthFileWithValidHridStartsWith.prefix,
              localAuthFileWithValidHridStartsWith.validHridStartsWith,
              localAuthFileWithValidHridStartsWith.baseUrl,
              localAuthFileWithValidHridStartsWith.isActive,
              `${date} by ${user.lastName}, ${user.firstName}`,
              true,
            );
          });
        },
      );
    });
  });
});
