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
        name: `C436844 auth source file active ${randomPostfix}`,
        prefix: getRandomLetters(6),
        hridStartsWith: '1',
        baseUrl: '',
        source: 'Local',
        isActive: true,
      };

      const fieldsToUpdate = {
        name: `C436844 Local source Updated by user (all fields)${getRandomPostfix()}`,
        prefix: getRandomLetters(7),
        hridStartsWith: '12000',
        baseUrl: `https://testing/field/baseurl/positivetest3${getRandomLetters(4)}/`,
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
        'C436844 Edit all editable fields of Local "Authority file" which does not have assigned "MARC authority" records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C436844'] },
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

          // 2 Click on the "Edit" (pencil) icon of "Local" authority file which has assigned "MARC authority" records
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

          // 3 Update all editable fields with unique valid value
          // Change the state of "Active" checkbox to opposite
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
            fieldsToUpdate.name,
          );
          ManageAuthorityFiles.editField(
            fieldsToUpdate.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            fieldsToUpdate.prefix,
          );
          ManageAuthorityFiles.editField(
            fieldsToUpdate.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
            fieldsToUpdate.hridStartsWith,
          );
          ManageAuthorityFiles.editField(
            fieldsToUpdate.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            fieldsToUpdate.baseUrl,
          );
          ManageAuthorityFiles.switchActiveCheckboxInFile(fieldsToUpdate.name, false);
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(fieldsToUpdate.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(fieldsToUpdate.name);

          // 4 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(fieldsToUpdate.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(fieldsToUpdate.name);
          ManageAuthorityFiles.checkSourceFileExists(
            fieldsToUpdate.name,
            fieldsToUpdate.prefix,
            fieldsToUpdate.startWithNumber,
            fieldsToUpdate.baseUrl,
            false,
            `${date} by ${user.lastName}, ${user.firstName}`,
            true,
          );
        },
      );
    });
  });
});
