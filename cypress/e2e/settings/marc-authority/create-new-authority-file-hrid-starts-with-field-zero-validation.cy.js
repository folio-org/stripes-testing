import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const errorHridRequired = 'Error saving data. HRID starts with is required.';
      const errorHridCannotStartWithZero = 'Error saving data. HRID cannot start with zero.';
      const authorityFile = {
        name: `C423711 Test file ${getRandomPostfix()}`,
        prefix: 'vp',
        hridStartsWith: [
          {
            firstValue: '',
            firstValueError: errorHridRequired,
            secondValue: '05',
            secondValueError: errorHridCannotStartWithZero,
          },
          {
            firstValue: '0',
            firstValueError: errorHridCannotStartWithZero,
            secondValue: '001',
            secondValueError: errorHridCannotStartWithZero,
          },
        ],
        baseURL: 'http://testurl.com/source',
        isActive: false,
      };
      const user = {};

      before('Create user, login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
          (userProperties) => {
            user.userProperties = userProperties;

            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
            });
          },
        );
      });

      after('Delete data, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
      });

      it(
        `C423711 "HRID starts with" field "zero" validation during creation of new "Authority file" 
            at "Settings >> MARC authority>>Manage authority files" pane (spitfire)`,
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          authorityFile.hridStartsWith.forEach((hridStartsWithValues) => {
            ManageAuthorityFiles.clickNewButton();
            ManageAuthorityFiles.fillAllFields(
              authorityFile.name,
              authorityFile.prefix,
              hridStartsWithValues.firstValue,
              authorityFile.baseURL,
              authorityFile.isActive,
            );
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkErrorInField(
              authorityFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
              hridStartsWithValues.firstValueError,
            );
            ManageAuthorityFiles.fillHridStartsWith(hridStartsWithValues.secondValue);
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkErrorInField(
              authorityFile.name,
              AUTHORITY_FILE_TEXT_FIELD_NAMES.HRID_STARTS_WITH,
              hridStartsWithValues.secondValueError,
            );
            ManageAuthorityFiles.clickCancelButton();
            ManageAuthorityFiles.checkSourceFileExistsByName(authorityFile.name, false);
          });
        },
      );
    });
  });
});
