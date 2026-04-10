import DateTools from '../../../support/utils/dateTools';
import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const randomLetters = getRandomLetters(15);
      const newAuthorityFile = {
        name: `C423994 auth file ${getRandomPostfix()}`,
        // "aat" is the default prefix for "Art & architecture thesaurus (AAT)" authority file
        prefix: `aat${randomLetters}`,
        startWithNumber: '100',
        baseUrl: `https://testurl.com/c423994${randomLetters}/`,
        isActive: true,
      };
      const testData = {
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
      };
      const user = {};

      before('Create user, login', () => {
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
        'C423994 Create new "Authority file" with "Prefix" field filled with value which contain existing default prefix (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423994'] },
        () => {
          // Step 1: Click "+New", verify new editable row
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();

          // Step 2: Fill all fields with prefix containing existing default prefix
          ManageAuthorityFiles.fillAllFields(
            newAuthorityFile.name,
            newAuthorityFile.prefix,
            newAuthorityFile.startWithNumber,
            newAuthorityFile.baseUrl,
            newAuthorityFile.isActive,
          );
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();

          // Step 3: Click Save → success, new row appears
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
