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
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

const randomLetters = getRandomLetters(7);
// Test data
const testData = {
  name: `AT_C423375_AuthSource_${getRandomPostfix()}`,
  prefix: randomLetters,
  startsWith: `${randomFourDigitNumber()}`,
  isActive: true,
  baseURL: `https://autotesturl.com/C423375/${randomLetters}/source/`,
  date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
  manageAuthFilesOption: 'Manage authority files',
  marcAuthorityTabName: 'MARC authority',
};

let userA;
let userB;

// Permissions
const permsCentralA = [Permissions.uiSettingsManageAuthorityFiles.gui];
const permsMember1A = [Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui];
const permsMember2B = [Permissions.uiSettingsViewAuthorityFiles.gui];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        before('Create users, assign affiliations, and login as User A in Central', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // Create User A: Central + Member 1
          cy.createTempUser(permsCentralA).then((userAProps) => {
            userA = userAProps;
            cy.assignAffiliationToUser(Affiliations.College, userA.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(userA.userId, permsMember1A);
          });
          // Create User B: Central + Member 2
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([]).then((userBProps) => {
            userB = userBProps;
            cy.assignAffiliationToUser(Affiliations.University, userB.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(userB.userId, permsMember2B);
          });
        });

        after('Delete users and authority file', () => {
          cy.resetTenant();
          cy.getAdminToken();
          if (userA) Users.deleteViaApi(userA.userId);
          if (userB) Users.deleteViaApi(userB.userId);
          cy.getAuthoritySourceFileIdViaAPI(testData.name).then((id) => {
            if (id) cy.deleteAuthoritySourceFileViaAPI(id, true);
          });
        });

        it(
          'C423375 Create new "Authority file" at "Settings >> MARC authority>>Manage authority files" pane of Central tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C423375'] },
          () => {
            // Step 1: User A in Central
            cy.resetTenant();
            cy.login(userA.username, userA.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.verifyTableHeaders();
            ManageAuthorityFiles.checkNewButtonEnabled(true);
            ManageAuthorityFiles.clickNewButton();
            ManageAuthorityFiles.verifyEditableRowAdded();
            ManageAuthorityFiles.checkNewButtonEnabled(false);
            // Step 2: Fill fields
            ManageAuthorityFiles.fillName(testData.name);
            ManageAuthorityFiles.fillPrefix(testData.prefix);
            ManageAuthorityFiles.fillHridStartsWith(testData.startsWith);
            ManageAuthorityFiles.fillBaseUrl(testData.baseURL);
            ManageAuthorityFiles.switchActiveCheckbox(true);
            ManageAuthorityFiles.checkCancelButtonEnabled();
            ManageAuthorityFiles.checkSaveButtonEnabled();
            // Step 3: Save
            ManageAuthorityFiles.clickSaveButtonAfterCreationFile();
            ManageAuthorityFiles.checkAfterSaveCreatedFile(testData.name);
            ManageAuthorityFiles.checkSourceFileExists(
              testData.name,
              testData.prefix,
              testData.startsWith,
              testData.baseURL,
              testData.isActive,
              `${testData.date} by ${userA.lastName}, ${userA.firstName}`,
              true, // isDeletable
            );
            // Step 5: Switch to Member 1
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();
            SettingsPane.checkOptionInSecondPaneExists(testData.manageAuthFilesOption, false);
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists(false);
            // Step 7: Log in as User B, switch to Member 2
            cy.waitForAuthRefresh(() => {
              cy.login(userB.username, userB.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              TopMenuNavigation.navigateToApp(
                APPLICATION_NAMES.SETTINGS,
                testData.marcAuthorityTabName,
              );
            }, 20_000);
            SettingsPane.selectSettingsTab(testData.manageAuthFilesOption);
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkAuthorityFilesTableNotEditable();
            ManageAuthorityFiles.checkNewButtonShown(false);
            ManageAuthorityFiles.checkLastUpdatedByUser(testData.name, `${testData.date} by`);
            ManageAuthorityFiles.checkSourceFileExistsByName(userA.lastName, false);
            // Step 8: Switch back to Central
            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
            SettingsPane.waitLoading();
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();
            SettingsPane.checkOptionInSecondPaneExists(testData.manageAuthFilesOption, false);
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists(false);
          },
        );
      });
    });
  });
});
