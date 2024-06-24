import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
      const localAuthorityFile = {
        name: `C442901 Test auth file ${getRandomPostfix()}`,
        prefix: `${getRandomLetters(8)}`,
        hridStartsWith: '1',
        isActive: false,
        baseUrl: `https://testurl-${randomFourDigitNumber()}.com/source/`,
      };
      const user = {};

      before('Create user, login', () => {
        cy.getAdminToken();
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
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
            });
          });
      });

      after('Delete data, user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userProperties.userId);
        ManageAuthorityFiles.deleteAuthoritySourceFileByNameViaApi(localAuthorityFile.name);
      });

      it(
        'C442901 User is able to create authority file with the same data as deleted authority file (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          // 1 Delete the record from preconditions:
          // Click on "delete" icon next to authority record from preconditions
          // Click on "Yes, delete" button on appeared popup
          ManageAuthorityFiles.clickDeleteButton(localAuthorityFile.name);
          ManageAuthorityFiles.clickConfirmDeletionButton(localAuthorityFile.name);
          ManageAuthorityFiles.checkAfterDeletionFile(localAuthorityFile.name);
          ManageAuthorityFiles.checkSourceFileExistsByName(localAuthorityFile.name, false);

          // 2 Click on "New" button
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();

          // 3 Populate the following fields with the same values as in just deleted record
          ManageAuthorityFiles.fillAllFields(
            localAuthorityFile.name,
            localAuthorityFile.prefix,
            localAuthorityFile.hridStartsWith,
            localAuthorityFile.baseUrl,
            localAuthorityFile.isActive,
          );

          // 4 Click on "Save" button on new record
          ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
          ManageAuthorityFiles.checkAfterSaveCreatedFile(localAuthorityFile.name);
          ManageAuthorityFiles.checkSourceFileExists(
            localAuthorityFile.name,
            localAuthorityFile.prefix,
            localAuthorityFile.hridStartsWith,
            localAuthorityFile.baseUrl,
            localAuthorityFile.isActive,
            `${date} by ${user.userProperties.lastName}, ${user.userProperties.firstName}`,
            true,
          );
        },
      );
    });
  });
});
