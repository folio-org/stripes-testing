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
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';

const randomLetters = getRandomLetters(7);
const testData = {
  name: `AT_C436922_AuthSource_${getRandomPostfix()}`,
  prefix: randomLetters,
  startsWith: `${randomFourDigitNumber()}`,
  isActive: true,
  baseURL: `https://autotesturl.com/C436922/${randomLetters}/source/`,
  manageAuthFilesOption: 'Manage authority files',
};

let user;
let authorityFileId;

const permsCentral = [Permissions.uiSettingsManageAuthorityFiles.gui];
const permsMember = [
  Permissions.uiSettingsViewAuthorityFiles.gui,
  Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
  Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
  Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        before('Create user, assign affiliations, and create authority file via API', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.createAuthoritySourceFileUsingAPI(
            testData.prefix,
            testData.startsWith,
            testData.name,
            testData.isActive,
            testData.baseURL,
          ).then((sourceId) => {
            authorityFileId = sourceId;
          });
          cy.createTempUser(permsCentral).then((userProps) => {
            user = userProps;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, permsMember);
          });
        });

        after('Delete user and authority file', () => {
          cy.resetTenant();
          cy.getAdminToken();
          if (user) Users.deleteViaApi(user.userId);
          if (authorityFileId) cy.deleteAuthoritySourceFileViaAPI(authorityFileId, true);
        });

        it(
          'C436922 Delete Local "Authority file" which doesn\'t have assigned "MARC authority" records from Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C436922'] },
          () => {
            // Step 1: Go to Manage authority files in Central
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
            });
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);
            ManageAuthorityFiles.checkEditButtonInRow(testData.name);
            // Step 2: Click Delete icon
            ManageAuthorityFiles.clickDeleteButton(testData.name);
            ManageAuthorityFiles.verifyDeleteModal(testData.name);
            ManageAuthorityFiles.clickConfirmDeletionButton();
            ManageAuthorityFiles.checkAfterDeletionFile(testData.name);
            ManageAuthorityFiles.checkSourceFileExistsByName(testData.name, false);
            // Step 4: Switch to Member tenant
            cy.waitForAuthRefresh(() => {
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              SettingsPane.waitLoading();
              cy.reload();
              SettingsPane.waitLoading();
            }, 20_000);
            SettingsPane.selectSettingsTab(testData.manageAuthFilesOption);
            ManageAuthorityFiles.waitLoading();
            ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
            ManageAuthorityFiles.checkSourceFileExistsByName(testData.name, false);
            // Step 6: Go to MARC authority app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            // Step 7: Click Actions > + New
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            MarcAuthority.checkSourceFileSelectShown();
            MarcAuthority.verifySourceFileOptionPresent(testData.name, false);
          },
        );
      });
    });
  });
});
