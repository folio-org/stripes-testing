import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

const randomLetters = getRandomLetters(20);
const randomNumber = randomFourDigitNumber();
const testData = {
  name: `AT_C436919_AuthSource_${getRandomPostfix()}`,
  prefix: randomLetters,
  startsWith: `1${randomNumber}`,
  isActive: true,
  baseURL: `https://autotesturl.com/C436919/${randomLetters}${randomNumber}/source/`,
};

let user;
let authorityFileId;

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      before('Create user and authority file via API', () => {
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
        cy.createTempUser([
          Permissions.uiSettingsManageAuthorityFiles.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((userProps) => {
          user = userProps;
        });
      });

      after('Delete user and authority file', () => {
        cy.getAdminToken();
        if (user) Users.deleteViaApi(user.userId);
        if (authorityFileId) cy.deleteAuthoritySourceFileViaAPI(authorityFileId, true);
      });

      it(
        'C436919 Delete Local "Authority file" which doesn\'t have assigned "MARC authority" records (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C436919'] },
        () => {
          // Step 1: Go to Settings > MARC authority > Manage authority files
          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitLoading,
            authRefresh: true,
          });
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);
          ManageAuthorityFiles.checkEditButtonInRow(testData.name);

          // Step 2: Click Delete icon — confirmation modal appears
          ManageAuthorityFiles.clickDeleteButton(testData.name);
          ManageAuthorityFiles.verifyDeleteModal(testData.name);

          // Step 3: Click "Yes, delete" — success callout, file removed from table
          ManageAuthorityFiles.clickConfirmDeletionButton();
          ManageAuthorityFiles.checkAfterDeletionFile(testData.name);
          ManageAuthorityFiles.checkSourceFileExistsByName(testData.name, false);

          // Step 4: Go to MARC authority app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();

          // Step 5: Click Actions > + New
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.checkSourceFileSelectShown();

          // Step 6: Verify deleted file is not present in the authority file dropdown
          MarcAuthority.verifySourceFileOptionPresent(testData.name, false);
        },
      );
    });
  });
});
