import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const invalidHridStartsWith = [
        'n',
        'vp3',
        '3v',
        '3v4',
        'v3d',
        '$',
        '$$3',
        '2$',
        '2$3',
        '$3%',
      ];
      const error = 'Error saving data. HRID can only contain numeric values.';
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
      });

      it(
        'C436951 "HRID starts with" field alpha and special characters validation during creation of new "Authority file" at "Settings >> MARC authority>>Manage authority files" pane (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          invalidHridStartsWith.forEach((hridStartsWith) => {
            const localAuthFile = {
              name: `C436951 Test file ${getRandomPostfix()}`,
              prefix: getRandomLetters(3),
              baseUrl: `http://testurl.com/source4${getRandomPostfix()}/`,
            };

            ManageAuthorityFiles.clickNewButton();
            ManageAuthorityFiles.fillAllFields(
              localAuthFile.name,
              localAuthFile.prefix,
              hridStartsWith,
              localAuthFile.baseUrl,
              false,
            );
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkErrorInField(
              localAuthFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
              error,
            );
            ManageAuthorityFiles.clickCancelButton();
            ManageAuthorityFiles.checkSourceFileExistsByName(localAuthFile, false);
          });
        },
      );
    });
  });
});
