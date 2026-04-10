import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
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
      const randomLetters = getRandomLetters(15);
      const title = `AT_C436851_MarcAuthority_${randomPostfix}`;
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const localAuthFile = {
        name: `C436851 auth file ${randomPostfix}`,
        prefix: randomLetters,
        newPrefix: `test${randomLetters}`,
        hridStartsWith: '1',
        baseUrl: '',
        source: 'Local',
        isActive: true,
      };
      const fields = [{ tag: '100', content: `$a ${title}`, indicators: ['\\', '\\'] }];
      const errorToastNotification = `Changes to ${localAuthFile.name} cannot be saved. Existing authority records are already assigned to this authority file.`;
      let adminUser;
      let user;
      let createdAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C436851');
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
              // wait for new file to be processed before assigning to authority
              // processing job runs approx. every minute
              cy.wait(70_000);
            });
          })
          .then(() => {
            cy.getAdminToken();
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
        'C436851 Edit "Prefix" field of Local "Authority file" which has assigned "MARC authority" records (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C436851'] },
        () => {
          // 1 Go to "Settings" app >> "MARC authority" >> "Manage authority files"
          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitLoading,
            authRefresh: true,
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

          // 3 Update value in editable "Prefix" field with unique valid value, ex.: "Prefix" = "willfail"
          ManageAuthorityFiles.editField(
            localAuthFile.name,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.PREFIX,
            localAuthFile.newPrefix,
          );

          // 4 Click on the "Save" button
          ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthFile.name);
          InteractorsTools.checkCalloutErrorMessage(errorToastNotification);
          ManageAuthorityFiles.checkRowEditableInEditMode(
            localAuthFile.name,
            localAuthFile.newPrefix,
            localAuthFile.hridStartsWith,
            localAuthFile.baseUrl,
            localAuthFile.isActive,
            localAuthFile.source,
            `${date} by ${adminUser}`,
            false,
            false,
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
        },
      );
    });
  });
});
