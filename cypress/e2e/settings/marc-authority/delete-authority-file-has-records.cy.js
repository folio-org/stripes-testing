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

const randomLetters = getRandomLetters(7);
const testData = {
  name: `AT_C436920_AuthSource_${getRandomPostfix()}`,
  prefix: randomLetters,
  startsWith: `${randomFourDigitNumber()}`,
  isActive: true,
  baseURL: '',
  marcAuthorityHeading: `AT_C436920_MarcAuthority_${getRandomPostfix()}`,
};
const authorityFields = [
  { tag: '100', content: `$a ${testData.marcAuthorityHeading}`, indicators: ['\\', '\\'] },
];

let user;
let authorityFileId;
let createdAuthorityRecordId;

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      before('Create user and test data via API', () => {
        cy.getAdminToken();
        // Clean up any leftover source files from previous runs
        cy.getAuthoritySourceFileDataViaAPI('AT_C436920_*').then(() => {
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
          // Wait for source file to be processed before creating MARC authority record
          cy.wait(70_000);
          cy.getAdminToken();
          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.prefix,
            testData.startsWith,
            authorityFields,
          ).then((createdRecordId) => {
            createdAuthorityRecordId = createdRecordId;
          });
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

      after('Delete user and test data', () => {
        cy.getAdminToken();
        if (user) Users.deleteViaApi(user.userId);
        if (createdAuthorityRecordId) MarcAuthorities.deleteViaAPI(createdAuthorityRecordId, true);
        if (authorityFileId) {
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(testData.name);
          cy.deleteAuthoritySourceFileViaAPI(authorityFileId, true);
        }
      });

      it(
        'C436920 Error shows when user tries to delete Local "Authority file" which has assigned "MARC authority" records (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C436920'] },
        () => {
          // Step 1: Go to Settings > MARC authority > Manage authority files
          cy.login(user.username, user.password, {
            path: TopMenu.settingsAuthorityFilesPath,
            waiter: ManageAuthorityFiles.waitLoading,
            authRefresh: true,
          });
          ManageAuthorityFiles.checkManageAuthorityFilesPaneExists();
          ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);

          // Step 2: Click Delete icon — confirmation modal appears
          ManageAuthorityFiles.clickDeleteButton(testData.name);
          ManageAuthorityFiles.verifyDeleteModal(testData.name);

          // Step 3: Click "Yes, delete" — error callout, file still in table
          ManageAuthorityFiles.clickConfirmDeletionButton();
          ManageAuthorityFiles.verifyDeleteAssignedSourceFileError(testData.name);
          ManageAuthorityFiles.checkSourceFileExistsByName(testData.name);

          // Step 4: Go to MARC authority app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();

          // Step 5: Click Actions > + New
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.checkSourceFileSelectShown();

          // Step 6: Verify deleted file still appears in authority file dropdown
          MarcAuthority.verifySourceFileOptionPresent(testData.name);
        },
      );
    });
  });
});
