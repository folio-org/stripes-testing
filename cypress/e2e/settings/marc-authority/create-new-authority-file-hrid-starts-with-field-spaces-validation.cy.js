import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomPostfix = getRandomPostfix();
      const localAuthFiles = [
        {
          name: `C436950 Test file s ${randomPostfix}`,
          prefix: getRandomLetters(2),
          hridStartsWith: ' ',
          baseUrl: `http://testurl.com/source3${getRandomPostfix()}/`,
        },
        {
          name: `C436950 Test file vp spaces ${randomPostfix}`,
          prefix: getRandomLetters(3),
          hridStartsWith: '1 2',
          baseUrl: `http://testurl.com/source4${getRandomPostfix()}/`,
        },
        {
          name: `C436950 Test file vp spaces ${randomPostfix}`,
          prefix: getRandomLetters(3),
          hridStartsWith: ' 12',
          baseUrl: `http://testurl.com/source4${getRandomPostfix()}/`,
        },
        {
          name: `C436950 Test file vp spaces ${randomPostfix}`,
          prefix: getRandomLetters(3),
          hridStartsWith: '12 ',
          baseUrl: `http://testurl.com/source4${getRandomPostfix()}/`,
        },
      ];
      const error = 'Error saving data. HRID cannot contain spaces.';
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
        'C436950 "HRID starts with" field "Spaces" validation during creation of new "Authority file" at "Settings >> MARC authority>>Manage authority files" pane (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C436950'] },
        () => {
          localAuthFiles.forEach((localAuthFile) => {
            ManageAuthorityFiles.clickNewButton();
            ManageAuthorityFiles.fillAllFields(
              localAuthFile.name,
              localAuthFile.prefix,
              localAuthFile.hridStartsWith,
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
          });
        },
      );
    });
  });
});
