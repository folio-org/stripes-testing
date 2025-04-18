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
import DateTools from '../../../../support/utils/dateTools';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const testData = {
          name: `Local source C423996 ${getRandomPostfix()}`,
          prefix: getRandomLetters(7),
          startsWith: '1000',
          baseUrl: `https://testurl-${getRandomLetters(7)}${randomFourDigitNumber()}.org/source/`,
          isActive: true,
          date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        };

        before('Create users, login', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
            (userProperties) => {
              testData.user = userProperties;
              cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
              cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.user.userId, [
                Permissions.uiSettingsManageAuthorityFiles.gui,
              ]);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(testData.user.userId, [
                Permissions.uiSettingsViewAuthorityFiles.gui,
              ]);
              cy.resetTenant();
              cy.waitForAuthRefresh(() => {
                cy.login(testData.user.username, testData.user.password);
                cy.reload();
              }, 20_000);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              cy.visit(TopMenu.settingsAuthorityFilesPath);
            },
          );
        });

        after('Delete data, users', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          cy.getAuthoritySourceFileIdViaAPI(testData.name).then((id) => {
            cy.deleteAuthoritySourceFileViaAPI(id);
          });
        });

        it(
          'C423996 Create new "Authority file" at "Settings >> MARC authority>>Manage authority files" pane of Member tenant (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C423996'] },
          () => {
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkActiveTooltipButtonShown();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkDefaultSourceFilesExist();
            ManageAuthorityFiles.clickNewButton();
            ManageAuthorityFiles.verifyEditableRowAdded();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkNewButtonEnabled(false);
            ManageAuthorityFiles.fillAllFields(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
            );
            ManageAuthorityFiles.checkCancelButtonEnabled();
            ManageAuthorityFiles.checkSaveButtonEnabled();
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkAfterSaveCreatedFile(testData.name);
            cy.reload();
            ManageAuthorityFiles.checkSourceFileExists(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              testData.date, // TO DO: update when MODELINKS-244 is done to `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`
              true,
            );
            ManageAuthorityFiles.checkNewButtonEnabled();

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            cy.visit(TopMenu.settingsAuthorityFilesPath);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkActiveTooltipButtonShown();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkDefaultSourceFilesExist();
            ManageAuthorityFiles.checkSourceFileExists(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              testData.date, // TO DO: update when MODELINKS-244 is done to `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`
              true,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
            SettingsPane.waitLoading();
            cy.visit(TopMenu.settingsAuthorityFilesPath);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkAuthorityFilesTableExists();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkActiveTooltipButtonShown();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkDefaultSourceFilesExist();
            ManageAuthorityFiles.checkSourceFileExists(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseUrl,
              testData.isActive,
              testData.date, // TO DO: update when MODELINKS-244 is done to `${testData.date} by ${testData.user.lastName}, ${testData.user.firstName}`
              true,
            );
          },
        );
      });
    });
  });
});
