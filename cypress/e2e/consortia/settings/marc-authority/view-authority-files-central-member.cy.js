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
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const testData = {
          name: `Local source C430207 ${getRandomPostfix()}`,
          prefix: getRandomLetters(7),
          startsWith: `1${randomFourDigitNumber()}`,
          isActive: true,
          baseURL: '',
        };

        before('Create users, login', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createAuthoritySourceFileUsingAPI(
            testData.prefix,
            testData.startsWith,
            testData.name,
            testData.isActive,
          ).then((sourceId) => {
            testData.sourceFileId = sourceId;
          });

          cy.createTempUser([Permissions.uiSettingsViewAuthorityFiles.gui]).then(
            (userPropertiesA) => {
              testData.userA = userPropertiesA;
              cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui]).then(
                (userPropertiesB) => {
                  testData.userB = userPropertiesB;
                  cy.assignAffiliationToUser(Affiliations.College, testData.userA.userId);
                  cy.assignAffiliationToUser(Affiliations.College, testData.userB.userId);
                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(testData.userA.userId, [
                    Permissions.uiSettingsViewAuthorityFiles.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.userB.userId, [
                    Permissions.uiSettingsViewAuthorityFiles.gui,
                    Permissions.uiSettingsManageAuthorityFiles.gui,
                  ]);
                },
              );
            },
          );
        });

        after('Delete data, users', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testData.userA.userId);
          Users.deleteViaApi(testData.userB.userId);
          cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId);
        });

        it(
          'C430207 View "Manage authority files" pane in "Settings >> MARC authority" with view permissions in Central and Member tenants (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C430207'] },
          () => {
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userA.username, testData.userA.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              SettingsPane.selectSettingsTab('MARC authority');
            }, 20_000).then(() => {
              SettingsPane.selectSettingsTab('Manage authority files');
              ManageAuthorityFiles.waitLoading();
              ManageAuthorityFiles.checkAuthorityFilesTableExists();
              ManageAuthorityFiles.verifyTableHeaders();
              ManageAuthorityFiles.checkActiveTooltipButtonShown();
              ManageAuthorityFiles.checkNewButtonShown(false);
              ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
              ManageAuthorityFiles.checkAuthorityFilesTableNotEditable();

              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              SettingsPane.waitLoading();
              SettingsPane.selectSettingsTab('MARC authority');
              SettingsPane.selectSettingsTab('Manage authority files');
              ManageAuthorityFiles.waitContentLoading();
              ManageAuthorityFiles.checkAuthorityFilesTableExists();
              ManageAuthorityFiles.verifyTableHeaders();
              ManageAuthorityFiles.checkActiveTooltipButtonShown();
              ManageAuthorityFiles.checkNewButtonShown(false);
              ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
              ManageAuthorityFiles.checkAuthorityFilesTableNotEditable();
              cy.logout();
            });
          },
        );

        it(
          'C430209 View "Manage authority files" pane in "Settings >> MARC authority" with CRUD permissions in Member tenant and no permissions in Central tenant (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C430209'] },
          () => {
            cy.login(testData.userB.username, testData.userB.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(TopMenu.settingsPath);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab('MARC authority');
            SettingsPane.selectSettingsTab('Manage authority files');
            ManageAuthorityFiles.waitContentLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkActiveTooltipButtonShown();
            ManageAuthorityFiles.checkNewButtonShown(false);
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkAuthorityFilesTableNotEditable();

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();
            cy.logout();
          },
        );
      });
    });
  });
});
