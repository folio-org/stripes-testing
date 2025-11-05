import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const localAuthorityFile = {
        name: `C436954 HRID starts with space validation ${getRandomPostfix()}`,
        prefix: `${getRandomLetters(8)}`,
        hridStartsWith: '1',
        isActive: true,
        baseUrl: 'http://testspace.com/',
      };
      const hridValuesWithSpaces = [' ', '1 2', ' 12', '12 '];
      const errorInvalidSpace = 'Error saving data. HRID cannot contain spaces.';
      const user = {};
      let adminUser;

      before('Create user, login, authority file', () => {
        cy.getAdminToken();
        cy.getAdminSourceRecord().then((record) => {
          adminUser = record;
        });
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user.userProperties = userProperties;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthorityFile.prefix,
              localAuthorityFile.hridStartsWith,
              localAuthorityFile.name,
              localAuthorityFile.isActive,
              localAuthorityFile.baseUrl,
            ).then((sourceId) => {
              localAuthorityFile.id = sourceId;
            });
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(user.userProperties.username, user.userProperties.password, {
                path: TopMenu.settingsAuthorityFilesPath,
                waiter: ManageAuthorityFiles.waitLoading,
              });
            });
          });
      });

      after('Delete data, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        cy.deleteAuthoritySourceFileViaAPI(localAuthorityFile.id);
      });

      it(
        'C436954 "HRID starts with" field "Spaces" validation during editing of Local "Authority file" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C436954'] },
        () => {
          hridValuesWithSpaces.forEach((value) => {
            ManageAuthorityFiles.clickEditButton(localAuthorityFile.name);
            ManageAuthorityFiles.editField(
              localAuthorityFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
              value,
            );
            ManageAuthorityFiles.clickSaveButtonAfterEditingFile(localAuthorityFile.name);
            ManageAuthorityFiles.checkErrorInField(
              localAuthorityFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
              errorInvalidSpace,
            );
            ManageAuthorityFiles.clickCancelButtonAfterEditingFile(localAuthorityFile.name);
            ManageAuthorityFiles.checkSourceFileExists(
              localAuthorityFile.name,
              localAuthorityFile.prefix,
              localAuthorityFile.hridStartsWith,
              localAuthorityFile.baseUrl,
              localAuthorityFile.isActive,
              `${date} by ${adminUser}`,
              true,
            );
          });
        },
      );
    });
  });
});
