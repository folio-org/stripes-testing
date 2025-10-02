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
  name: `AT_C449370_AuthSource_${getRandomPostfix()}`,
  prefix: randomLetters,
  startsWith: `${randomFourDigitNumber()}`,
  isActive: true,
  baseURL: `https://autotesturl.com/C449370/${randomLetters}/source/`,
  manageAuthFilesOption: 'Manage authority files',
  marcAuthorityTabName: 'MARC authority',
  marcAuthorityHeading: `AT_C449370_MarcAuthority_${getRandomPostfix()}`,
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
          cy.getAuthoritySourceFileDataViaAPI('AT_C449370_*').then(() => {
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
            // Create a Shared MARC authority record assigned to the file in Central tenant
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.prefix,
              testData.startsWith,
              authorityFields,
            ).then((createdRecordId) => {
              createdAuthorityRecordId = createdRecordId;

              cy.getAdminToken();
              cy.createTempUser(perms).then((userProps) => {
                user = userProps;
                cy.assignAffiliationToUser(Affiliations.College, user.userId);

                // Delete the shared MARC authority record
                MarcAuthorities.deleteViaAPI(createdAuthorityRecordId);

                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(user.userId, perms);
              });
            });
          });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          if (user) Users.deleteViaApi(user.userId);
          if (createdAuthorityRecordId) MarcAuthorities.deleteViaAPI(createdAuthorityRecordId, true);
          if (authorityFileId) {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(testData.name);
            cy.deleteAuthoritySourceFileViaAPI(authorityFileId, true);
          }
        });

        it(
          'C449370 Authority file which had assigned Shared "MARC authority" records in the past cannot be deleted because of Retention policy (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C449370'] },
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
            }, 20_000);
            // Step 2: Switch to Member tenant and check the source file
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(testData.manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);
            // Step 2: Try to delete the source file
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
