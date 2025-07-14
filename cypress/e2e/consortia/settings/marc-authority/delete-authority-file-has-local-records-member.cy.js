import Permissions from '../../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';

const randomLetters = getRandomLetters(7);
const testData = {
  name: `AT_C436927_AuthSource_${getRandomPostfix()}`,
  prefix: randomLetters,
  startsWith: `${randomFourDigitNumber()}`,
  isActive: true,
  baseURL: `https://autotesturl.com/C436927/${randomLetters}/source/`,
  manageAuthFilesOption: 'Manage authority files',
  marcAuthorityTabName: 'MARC authority',
  marcAuthorityHeading: `AT_C436927_MarcAuthority_${getRandomPostfix()}`,
};
const authorityFields = [
  { tag: '100', content: `$a ${testData.marcAuthorityHeading}`, indicators: ['\\', '\\'] },
];

let user;
let authorityFileId;
let createdAuthorityRecordId;

const permsCentral = [
  Permissions.uiSettingsManageAuthorityFiles.gui,
  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
  Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
  Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
];
const permsMember = [Permissions.uiSettingsViewAuthorityFiles.gui];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // Try to delete previously created source files, or at least deactivate them
          cy.getAuthoritySourceFileDataViaAPI('AT_C436927_*').then(() => {
            Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
              ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
              cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
            });
          });
          cy.createAuthoritySourceFileUsingAPI(
            testData.prefix,
            testData.startsWith,
            testData.name,
            testData.isActive,
            testData.baseURL,
          ).then((sourceId) => {
            authorityFileId = sourceId;
            // Create a Local MARC authority record assigned to the file in Member tenant
            cy.setTenant(Affiliations.College);
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.prefix,
              testData.startsWith,
              authorityFields,
            ).then((createdRecordId) => {
              createdAuthorityRecordId = createdRecordId;

              cy.resetTenant();
              cy.getAdminToken();
              cy.createTempUser(permsCentral).then((userProps) => {
                user = userProps;
                cy.assignAffiliationToUser(Affiliations.College, user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(user.userId, permsMember);
              });
            });
          });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          if (user) Users.deleteViaApi(user.userId);
          cy.setTenant(Affiliations.College);
          if (createdAuthorityRecordId) MarcAuthorities.deleteViaAPI(createdAuthorityRecordId, true);
          cy.resetTenant();
          if (authorityFileId) {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(testData.name);
            cy.deleteAuthoritySourceFileViaAPI(authorityFileId, true);
          }
        });

        it(
          'C436927 Error shows when user tries to delete Local "Authority file" which has assigned Local "MARC authority" records from Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C436927'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              TopMenuNavigation.navigateToApp(
                APPLICATION_NAMES.SETTINGS,
                testData.marcAuthorityTabName,
              );
              SettingsPane.waitLoading();
              cy.reload();
            }, 20_000);
            SettingsPane.waitLoading();
            // Step 1: Switch to Member tenant and go to Manage authority files
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.selectSettingsTab(testData.manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);
            // Step 2: Click Delete icon
            ManageAuthorityFiles.clickDeleteButton(testData.name);
            ManageAuthorityFiles.verifyDeleteModal(testData.name);
            ManageAuthorityFiles.clickConfirmDeletionButton();
            ManageAuthorityFiles.verifyDeleteAssignedSourceFileError(testData.name);
            ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);
            // Step 4: Switch to Central tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(testData.manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExistsByName(testData.name, true);
            // Step 6: Go to MARC authority app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            // Step 7: Click Actions > + New
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            MarcAuthority.checkSourceFileSelectShown();
            MarcAuthority.verifySourceFileOptionPresent(testData.name);
          },
        );
      });
    });
  });
});
