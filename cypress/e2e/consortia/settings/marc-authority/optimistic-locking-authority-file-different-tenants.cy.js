import Permissions from '../../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(20);
        const randomNumber = randomNDigitNumber(3);
        const testData = {
          name: `AT_C436918 Local source ${randomPostfix}`,
          prefix: randomLetters,
          startsWith: `1${randomNumber}`,
          baseUrl: `https://c436918/central/${randomLetters}${randomNumber}/original/`,
          updatedBaseUrl: `https://c436918/central/${randomLetters}${randomNumber}/userb-update/`,
          isActive: true,
        };

        let userA;
        let userB;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createAuthoritySourceFileUsingAPI(
            testData.prefix,
            testData.startsWith,
            testData.name,
            testData.isActive,
            testData.baseUrl,
          ).then((sourceId) => {
            testData.sourceFileId = sourceId;
          });

          // User A: Central CRUD only
          cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
            (userProperties) => {
              userA = userProperties;
            },
          );

          // User B: Central CRUD + Member view
          cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
            (userProperties) => {
              userB = userProperties;
              cy.affiliateUserToTenant({
                tenantId: Affiliations.College,
                userId: userB.userId,
                permissions: [Permissions.uiSettingsViewAuthorityFiles.gui],
              });
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);
          cy.deleteAuthoritySourceFileViaAPI(testData.sourceFileId, true);
        });

        it(
          'C436918 Optimistic locking error appears when 2 different users edit the same "Authority file" from different tenants (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C436918'] },
          () => {
            cy.resetTenant();
            cy.login(userA.username, userA.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            // Step 1: User A clicks Edit — row becomes editable, Save disabled
            ManageAuthorityFiles.clickEditButton(testData.name);
            ManageAuthorityFiles.checkCancelButtonEnabledInFile(testData.name, true);
            ManageAuthorityFiles.checkSaveButtonEnabledInFile(testData.name, false);

            // Step 2: User A switches Active checkbox — Save becomes enabled
            ManageAuthorityFiles.switchActiveCheckboxInFile(testData.name, !testData.isActive);
            ManageAuthorityFiles.checkCancelButtonEnabledInFile(testData.name, true);
            ManageAuthorityFiles.checkSaveButtonEnabledInFile(testData.name, true);

            // Steps 3-5: User B (via API, simulating a second browser tab) edits and saves the same file
            // Note: Cypress does not support multiple browser tabs, so User B's actions are done via API
            cy.resetTenant();
            cy.getToken(userB.username, userB.password);
            ManageAuthorityFiles.updateBaseUrlInAuthorityFileViaApi(
              testData.name,
              testData.updatedBaseUrl,
            );

            cy.then(() => {
              // Restore User A's token for subsequent UI steps
              cy.getToken(userA.username, userA.password);

              // Step 6: User A clicks Save — optimistic locking error appears
              ManageAuthorityFiles.clickSaveButtonAfterEditingFile(testData.name);
              ManageAuthorityFiles.verifyOptimisticLockingError(testData.name);
              ManageAuthorityFiles.checkCancelButtonEnabledInFile(testData.name, true);
              ManageAuthorityFiles.checkSaveButtonEnabledInFile(testData.name, true);

              // Step 7: User A clicks Cancel — changes are discarded
              ManageAuthorityFiles.clickCancelButtonAfterEditingFile(testData.name);

              // Step 8: Reload page — User B's changes (updatedBaseUrl) are displayed
              cy.reload();
              ManageAuthorityFiles.waitLoading();
              ManageAuthorityFiles.checkSourceFileExists(
                testData.name,
                testData.prefix,
                testData.startsWith,
                testData.updatedBaseUrl,
                testData.isActive,
                '',
              );
            });
          },
        );
      });
    });
  });
});
