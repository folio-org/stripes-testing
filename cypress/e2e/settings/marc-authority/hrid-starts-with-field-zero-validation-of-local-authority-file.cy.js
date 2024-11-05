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
      const localAuthFile = {
        name: `C436867 auth source file active ${randomPostfix}`,
        prefix: getRandomLetters(6),
        startWithNumber: '1',
        baseUrl: '',
        source: 'Local',
        isActive: true,
      };
      const newHridStartsWith = ['', '05', '0', '001'];
      const errorHridRequired = 'Error saving data. HRID starts with is required.';
      const errorHridStartsWithZero = 'Error saving data. HRID cannot start with zero.';
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
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id);
      });

      it(
        'C436867 "HRID starts with" field "zero" validation during editing of Local "Authority file" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436867'] },
        () => {
          // 1 Click on the "Edit" (pencil) icon of "Local" authority file.
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
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(localAuthFile.name, false);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(localAuthFile.name);

          // 2 Clear "HRID starts with" field
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            newHridStartsWith[0],
          );
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(localAuthFile.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(localAuthFile.name);

          // 3 Click on the "Save" button in "Actions" column
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            errorHridRequired,
          );

          // 4 Fill in the "HRID starts with" field with value which contains leading zeroes
          // Click on the "Save" button
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            newHridStartsWith[1],
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            errorHridStartsWithZero,
          );

          // 5 Click on the "Cancel" button
          ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.hridStartsWith,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            `${date} by ${adminUser}`,
            true,
          );

          // 6 Update "HRID starts with" field of "Local" authority file with value which contains only zeroes:
          // Click on the "Edit" (pencil) icon of "Local" authority file.
          // Update "HRID starts with" field = "0"
          // Click on the "Save" button
          ManageAuthorityFiles.clickEditButton(localAuthFile.name);
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            newHridStartsWith[2],
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            errorHridStartsWithZero,
          );

          // 7 Update the "HRID starts with" field with value which contain more than 1 leading zero:
          // Update "HRID starts with" = "001"
          // Click on the "Save" button
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            newHridStartsWith[3],
          );
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkErrorInField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            errorHridStartsWithZero,
          );

          // 8 Click on the "Cancel" button
          ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.hridStartsWith,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            `${date} by ${adminUser}`,
            true,
          );
        },
      );
    });
  });
});
