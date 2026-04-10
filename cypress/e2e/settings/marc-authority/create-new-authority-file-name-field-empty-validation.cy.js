import DateTools from '../../../support/utils/dateTools';
import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { AUTHORITY_FILE_TEXT_FIELD_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomLetters = getRandomLetters(15);
      const newAuthorityFile = {
        name: `C423376 new auth file ${getRandomPostfix()}`,
        prefix: `new${randomLetters}`,
        startWithNumber: '1',
        baseUrl: `https://testurl.com/c423376${randomLetters}/`,
        isActive: true,
      };
      const errorEmptyName = 'Please fill this in to continue';
      const testData = {
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
      };
      const user = {};

      before('Create user, data, login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui])
          .then((userProperties) => {
            user.userProperties = userProperties;
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
        cy.getAuthoritySourceFileIdViaAPI(newAuthorityFile.name).then((id) => {
          cy.deleteAuthoritySourceFileViaAPI(id);
        });
      });

      it(
        'C423376 Empty "Name" field validation during creation of new "Authority file" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423376'] },
        () => {
          // Step 1: Click "+New", verify new editable row
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();

          // Step 2: Fill all fields except Name
          ManageAuthorityFiles.fillPrefix(newAuthorityFile.prefix);
          ManageAuthorityFiles.fillHridStartsWith(newAuthorityFile.startWithNumber);
          ManageAuthorityFiles.fillBaseUrl(newAuthorityFile.baseUrl);
          ManageAuthorityFiles.switchActiveCheckbox();
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();

          // Step 3: Click Save → error on empty Name field
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkErrorInField(
            newAuthorityFile.baseUrl,
            AUTHORITY_FILE_TEXT_FIELD_NAMES.NAME,
            errorEmptyName,
          );

          // Step 4: Fill in Name field
          ManageAuthorityFiles.fillName(newAuthorityFile.name);
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();

          // Step 5: Click Save → success, new row appears
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkAfterSaveCreatedFile(newAuthorityFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            newAuthorityFile.name,
            newAuthorityFile.prefix,
            newAuthorityFile.startWithNumber,
            newAuthorityFile.baseUrl,
            newAuthorityFile.isActive,
            `${testData.date} by ${user.userProperties.lastName}, ${user.userProperties.firstName}`,
            true,
          );
        },
      );
    });
  });
});
