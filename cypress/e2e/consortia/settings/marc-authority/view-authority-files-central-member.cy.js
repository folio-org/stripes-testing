import Permissions from '../../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const testData = {
        name: `Local source C430207 ${getRandomPostfix()}`,
        prefix: getRandomLetters(7),
        startsWith: `1${randomFourDigitNumber()}`,
        isActive: true,
        baseURL: '',
      };

      beforeEach('Create user, login', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsViewAuthorityFiles.gui]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);

          cy.createAuthoritySourceFileUsingAPI(
            testData.prefix,
            testData.startsWith,
            testData.name,
            testData.isActive,
          ).then((sourceId) => {
            testData.sourceFileId = sourceId;
          });

          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiSettingsViewAuthorityFiles.gui,
          ]);

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitContentLoading,
          }).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });
      });

      afterEach('Delete data, user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId);
      });

      it(
        'C430207 View "Manage authority files" pane in "Settings >> MARC authority" with view permissions in Central and Member tenants (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          ManageAuthorityFiles.checkAuthorityFilesTableExists();
          ManageAuthorityFiles.verifyTableHeaders();
          ManageAuthorityFiles.checkNewButtonEnabled(false);
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkAuthorityFilesTableNotEditable();

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(TopMenu.settingsAuthorityFilesPath);
          ManageAuthorityFiles.waitContentLoading();
          ManageAuthorityFiles.checkAuthorityFilesTableExists();
          ManageAuthorityFiles.verifyTableHeaders();
          ManageAuthorityFiles.checkNewButtonEnabled(false);
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkAuthorityFilesTableNotEditable();
        },
      );
    });
  });
});
