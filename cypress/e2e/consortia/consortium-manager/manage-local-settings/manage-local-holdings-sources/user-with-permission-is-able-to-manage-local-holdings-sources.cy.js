import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
  messages,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import HoldingsSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsSourcesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import HoldingsSources from '../../../../../support/fragments/settings/inventory/holdings/holdingsSources';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local holdings sources', () => {
        let user;
        const testData = {
          sourceName: `AT_C648482_HoldingsSource_${getRandomPostfix()}`,
          editedSourceName: `AT_C648482_HoldingsSource_${getRandomPostfix()}_edited`,
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.inventoryCRUDHoldingsSources.gui]).then(
            (userProperties) => {
              user = userProperties;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.inventoryCRUDHoldingsSources.gui,
              ]);

              cy.waitForAuthRefresh(() => {
                cy.login(user.username, user.password);
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                cy.reload();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              }, 20_000);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
          cy.setTenant(Affiliations.College);
          HoldingsSources.getHoldingsSourcesViaApi({ query: `name="${testData.sourceName}"` }).then(
            (holdingsSources) => {
              holdingsSources.forEach((holdingsSource) => {
                HoldingsSources.deleteViaApi(holdingsSource.id);
              });
            },
          );
          HoldingsSources.getHoldingsSourcesViaApi({
            query: `name="${testData.editedSourceName}"`,
          }).then((holdingsSources) => {
            holdingsSources.forEach((holdingsSource) => {
              HoldingsSources.deleteViaApi(holdingsSource.id);
            });
          });
        });

        it(
          'C648482 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local holdings sources of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C648482'] },
          () => {
            // Steps 1-2: Navigate to Consortium manager app and verify member selection
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();

            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 5: Navigate to Holdings sources settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsSourcesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Steps 6-8: Create new holdings source
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.sourceName });

            // Steps 9-10: Confirm creation with "Keep editing" button
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Modal should appear asking to share with member libraries
            ConfirmCreate.waitLoadingConfirmCreate(testData.sourceName);
            ConfirmCreate.clickKeepEditing();

            // Verify we're still in edit mode after "Keep editing"
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            ConsortiaControlledVocabularyPaneset.clickSave();

            // This time click "Confirm" button
            ConfirmCreate.waitLoadingConfirmCreate(testData.sourceName);
            ConfirmCreate.clickConfirm();

            // Step 11: Verify holdings source is created and displayed in list
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.college],
              [actionIcons.edit, actionIcons.trash],
            );

            // Steps 12-14: Edit the holdings source
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.sourceName,
              tenantNames.college,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedSourceName,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              `${testData.editedSourceName} was successfully updated for ${tenantNames.college} library.`,
            );

            // Verify edited holdings source is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.editedSourceName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Steps 15-17: Delete holdings source with confirmation modal
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.editedSourceName,
              tenantNames.college,
              actionIcons.trash,
            );

            // Cancel deletion
            DeleteCancelReason.waitLoadingDeleteModal('holdings source', testData.editedSourceName);
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.editedSourceName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Trigger and cofirm deletion
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.editedSourceName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted('holdings source', testData.editedSourceName),
            );
            // Verify holdings source is no longer in the list
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.editedSourceName,
              tenantNames.college,
            );

            // Steps 18-20: Deselect members and verify empty list
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);
            SelectMembers.saveAndClose();

            // Verify holdings sources list is empty after deselecting all members
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);
            ConsortiumManagerApp.verifyListIsEmpty();
          },
        );
      });
    });
  });
});
