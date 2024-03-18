import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const testData = {
        name: `Local source ${getRandomPostfix()}`,
        prefix: getRandomLetters(7),
        startsWith: `1${randomFourDigitNumber()}`,
        isActive: true,
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
      };

      before('Create user, login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
            });
          },
        );
      });

      after('Delete data, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.getAuthoritySourceFileIdViaAPI(testData.name).then((id) => {
          cy.deleteAuthoritySourceFileViaAPI(id);
        });
      });

      it(
        'C423992 Create new "Authority file" with empty "Base URL" field at "Settings >> MARC authority >> Manage authority files" pane (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();
          ManageAuthorityFiles.verifyTableHeaders();
          ManageAuthorityFiles.fillAllFields(
            testData.name,
            testData.prefix,
            testData.startsWith,
            '',
            testData.isActive,
          );
          ManageAuthorityFiles.checkCancelButtonEnabled();
          ManageAuthorityFiles.checkSaveButtonEnabled();
          ManageAuthorityFiles.clickSaveButton();
          ManageAuthorityFiles.checkAfterSave(testData.name);
          cy.reload();
          ManageAuthorityFiles.checkSourceFileExists(
            testData.name,
            testData.prefix,
            testData.startsWith,
            '',
            testData.isActive,
            `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`,
            true,
          );
        },
      );
    });
  });
});
