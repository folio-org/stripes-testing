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
import ResourceTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/resourceTypesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ResourceTypes from '../../../../../support/fragments/settings/inventory/instances/resourceTypes';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Resource types', () => {
        let user;
        const testData = {
          resourceTypeName: `AT_C411563_ResourceType_${getRandomPostfix()}`,
          resourceTypeCode: `AT_C411563_${getRandomPostfix()}`,
          editedResourceTypeName: `AT_C411563_ResourceType_${getRandomPostfix()}_edited`,
          editedResourceTypeCode: `AT_C411563_${getRandomPostfix()}_edited`,
        };
        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTINGS_OPTION: 'resource type',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.crudDefinedResourceTypes.gui]).then((userProperties) => {
            user = userProperties;

            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.crudDefinedResourceTypes.gui,
            ]);

            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              cy.reload();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            }, 20_000);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);

          // Cleanup resource types from both tenants
          [Affiliations.Consortia, Affiliations.College].forEach((tenant) => {
            cy.setTenant(tenant);
            [testData.resourceTypeName, testData.editedResourceTypeName].forEach((name) => {
              ResourceTypes.getViaApi({ query: `name="${name}"` }).then((resourceTypes) => {
                resourceTypes.forEach((resourceType) => {
                  ResourceTypes.deleteViaApi(resourceType.id);
                });
              });
            });
          });
        });

        it(
          'C411563 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local resource types of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411563'] },
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

            // Step 5: Navigate to Resource types settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ResourceTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Steps 6-8: Create new resource type
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.resourceTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.resourceTypeCode,
            });

            // Steps 9-10: Confirm creation with "Keep editing" button
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Modal should appear asking to share with member libraries
            ConfirmCreate.waitLoadingConfirmCreate(testData.resourceTypeName);
            ConfirmCreate.clickKeepEditing();

            // Verify we're still in edit mode after "Keep editing"
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            ConsortiaControlledVocabularyPaneset.clickSave();

            // This time click "Confirm" button
            ConfirmCreate.waitLoadingConfirmCreate(testData.resourceTypeName);
            ConfirmCreate.clickConfirm();

            // Step 11: Verify resource type is created and displayed in list
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.resourceTypeName,
                testData.resourceTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Steps 12-14: Edit the resource type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.resourceTypeName,
              tenantNames.college,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedResourceTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedResourceTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedResourceTypeName, tenantNames.college),
            );

            // Verify edited resource type is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedResourceTypeName,
              tenantNames.college,
              [
                testData.editedResourceTypeName,
                testData.editedResourceTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Steps 15-17: Delete resource type with confirmation modal
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.editedResourceTypeName,
              tenantNames.college,
              actionIcons.trash,
            );

            // Cancel deletion
            DeleteCancelReason.waitLoadingDeleteModal(
              CONSTANTS.SETTINGS_OPTION,
              testData.editedResourceTypeName,
            );
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedResourceTypeName,
              tenantNames.college,
              [
                testData.editedResourceTypeName,
                testData.editedResourceTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Trigger and confirm deletion
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.editedResourceTypeName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.editedResourceTypeName),
            );
            // Verify resource type is no longer in the list
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.editedResourceTypeName,
              tenantNames.college,
            );

            // Steps 18-20: Deselect members and verify empty list
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);
            SelectMembers.saveAndClose();

            // Verify resource types list is empty after deselecting all members
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);
            ConsortiumManagerApp.verifyListIsEmpty();
          },
        );
      });
    });
  });
});
