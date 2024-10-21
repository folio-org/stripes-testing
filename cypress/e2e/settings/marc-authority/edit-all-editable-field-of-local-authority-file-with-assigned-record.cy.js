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
import InteractorsTools from '../../../support/utils/interactorsTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const title = `C436855 Test title ${randomPostfix}`;
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const localAuthFile = {
        name: `C436855 auth source file active ${randomPostfix}`,
        prefix: getRandomLetters(6),
        hridStartsWith: '1',
        baseUrl: '',
        source: 'Local',
        isActive: true,
      };
      const fieldsToCreateMarcAuthority = [
        { tag: '100', content: `$a ${title}`, indicators: ['\\', '\\'] },
      ];
      const fieldsToUpdate = {
        name: `C436855 Local assigned source Updated by user (all fields)${getRandomPostfix()}`,
        prefix: getRandomLetters(6),
        hridStartsWith: `${randomFourDigitNumber()}`,
        baseUrl: `http://testing/field/baseurl/positivetest6${getRandomLetters(4)}/`,
      };
      const errorToastNotification = `Changes to ${localAuthFile.name} cannot be saved. Existing authority records are already assigned to this authority file.`;
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
              fieldsToCreateMarcAuthority,
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
        'C436855 Edit all editable fields of Local "Authority file" which has assigned "MARC authority" records (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436855'] },
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

          // 3 Note values stored in "Prefix" and "HRID starts with" fields
          // 4 Update all editable fields with unique valid value, ex:
          // "Name" = "Local assigned source Updated by user (all fields)"
          // "Prefix" = "assigned"
          // "HRID starts with" = "125"
          // "Base URL" = "http://testing/field/baseurl/positivetest6"
          // Change the state of "Active" checkbox to opposite.
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

          // 5 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(fieldsToUpdate.name);
          InteractorsTools.checkCalloutErrorMessage(errorToastNotification);
          ManageAuthorityFiles.checkRowEditableInEditMode(
            fieldsToUpdate.name,
            fieldsToUpdate.prefix,
            fieldsToUpdate.hridStartsWith,
            fieldsToUpdate.baseUrl,
            false,
            localAuthFile.source,
            `${date} by ${adminUser}`,
            false,
            false,
          );

          // 6 Click on the "Cancel" button
          ManageAuthorityFiles.clickCancelButtonAfterEditingFile(fieldsToUpdate.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthFile.name,
            localAuthFile.prefix,
            localAuthFile.hridStartsWith,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            `${date} by ${adminUser}`,
            true,
          );

          // 7 Click on the "Edit" (pencil) icon of the same "Local" authority file
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

          // 8 Update all editable fields with unique valid value, ex:
          // "Name" = "Local assigned source Updated by user (all fields)"
          // "Base URL" = "http://testing/field/baseurl/positivetest6"
          // Change the state of "Active" checkbox to opposite.
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
            fieldsToUpdate.name,
          );
          ManageAuthorityFiles.editField(
            fieldsToUpdate.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.BASE_URL,
            fieldsToUpdate.baseUrl,
          );
          ManageAuthorityFiles.switchActiveCheckboxInFile(fieldsToUpdate.name, false);
          ManageAuthorityFiles.checkSaveButtonEnabledInFile(fieldsToUpdate.name);
          ManageAuthorityFiles.checkCancelButtonEnabledInFile(fieldsToUpdate.name);

          // 9 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(fieldsToUpdate.name);
          ManageAuthorityFiles.checkAfterSaveEditedFile(fieldsToUpdate.name);
          ManageAuthorityFiles.checkSourceFileExists(
            fieldsToUpdate.name,
            localAuthFile.prefix,
            localAuthFile.startWithNumber,
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
