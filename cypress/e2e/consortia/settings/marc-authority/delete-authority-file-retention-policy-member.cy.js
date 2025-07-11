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
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';

const randomLetters = getRandomLetters(7);
const testData = {
  name: `AT_C449369_AuthSource_${getRandomPostfix()}`,
  prefix: randomLetters,
  startsWith: `${randomFourDigitNumber()}`,
  isActive: true,
  baseURL: `https://autotesturl.com/C449369/${randomLetters}/source/`,
  manageAuthFilesOption: 'Manage authority files',
  marcAuthorityTabName: 'MARC authority',
  marcAuthorityHeading: `AT_C449369_MarcAuthority_${getRandomPostfix()}`,
};
const authorityFields = [
  { tag: '100', content: `$a ${testData.marcAuthorityHeading}`, indicators: ['\\', '\\'] },
];

let user;
let authorityFileId;
let createdAuthorityRecordId;

const perms = [
  Permissions.uiSettingsManageAuthorityFiles.gui,
  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
  Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
  Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
  Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          // Try to delete previously created source files, or at least deactivate them
          cy.getAuthoritySourceFileDataViaAPI('AT_C449369_*').then(() => {
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
              cy.createTempUser(perms).then((userProps) => {
                user = userProps;
                cy.assignAffiliationToUser(Affiliations.College, user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(user.userId, perms);
                // Delete authority record assigned to the file
                MarcAuthorities.deleteViaAPI(createdAuthorityRecordId);
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
          'C449369 Authority file which had assigned Local "MARC authority" records in the past cannot be deleted because of Retention policy (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C449369'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              cy.reload();
            }, 20_000);
            // Step 2: Switch to Member tenant and check the source file
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              testData.marcAuthorityTabName,
            );
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(testData.manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);
            // Step 3: Try to delete the source file
            ManageAuthorityFiles.clickDeleteButton(testData.name);
            ManageAuthorityFiles.verifyDeleteModal(testData.name);
            ManageAuthorityFiles.clickConfirmDeletionButton();
            ManageAuthorityFiles.verifyDeleteAssignedSourceFileError(testData.name);
            ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);
          },
        );
      });
    });
  });
});
