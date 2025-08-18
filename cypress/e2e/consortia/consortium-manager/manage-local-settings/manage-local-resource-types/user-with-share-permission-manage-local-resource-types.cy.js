import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
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
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';
import Permissions from '../../../../../support/dictionary/permissions';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Resource types', () => {
        let userA;
        let userB;
        const testData = {
          resourceTypeName: `AT_C411566_ResourceType_${getRandomPostfix()}`,
          resourceTypeCode: `AT_C411566_${getRandomPostfix()}`,
          editedResourceTypeCode: `AT_C411566_${getRandomPostfix()}_edited`,
        };

        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTINGS_OPTION: 'resource type',
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create User A in College (member-1) tenant per TestRail preconditions
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiOrganizationsView.gui]).then((userProperties) => {
            userA = userProperties;

            // Assign User A affiliation to Central and University (member-2) tenants
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, userA.userId);

            // Assign Central tenant permissions
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.consortiaSettingsConsortiumManagerShare.gui,
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.crudDefinedResourceTypes.gui,
            ]);

            // Assign University (member-2) tenant permissions
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.crudDefinedResourceTypes.gui,
            ]);

            // Create User B in Central tenant
            cy.resetTenant();
            cy.createTempUser([Permissions.crudDefinedResourceTypes.gui]).then(
              (userBProperties) => {
                userB = userBProperties;

                // Assign User B affiliations
                cy.assignAffiliationToUser(Affiliations.College, userB.userId);
                cy.assignAffiliationToUser(Affiliations.University, userB.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userB.userId, [
                  Permissions.crudDefinedResourceTypes.gui,
                ]);

                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userB.userId, [
                  Permissions.crudDefinedResourceTypes.gui,
                ]);

                cy.resetTenant();
                cy.waitForAuthRefresh(() => {
                  cy.login(userA.username, userA.password);
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                  cy.reload();
                  ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                  ConsortiumManager.switchActiveAffiliation(
                    tenantNames.college,
                    tenantNames.central,
                  );
                }, 20_000);
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userB.userId);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userA.userId);
          // Clean up resource types from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              ResourceTypes.getViaApi({
                query: `name="${testData.resourceTypeName}"`,
              }).then((resourceTypes) => {
                resourceTypes.forEach((resourceType) => {
                  ResourceTypes.deleteViaApi(resourceType.id);
                });
              });
            },
          );
        });

        it(
          'C411566 User with "Consortium manager: Can share settings to all members" permission can manage local resource types via "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411566'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Inventory settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 3: Navigate to Resource types and verify permission error
            ResourceTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears for member-1
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 4: Create new resource type with permissions issue
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is enabled (difference from permissions restrictions test)
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 5: Fill in name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.resourceTypeName,
            });

            // Step 6: Fill in code field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.resourceTypeCode,
            });

            // Step 7: Try to save and verify error
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.clickSave();
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));
            // ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            //   name: 'Error on saving data',
            // });
            // ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 8: Cancel creation
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.resourceTypeName,
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 9: Open Select members modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 10: Unselect member-1 tenant (College)
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 11: Save member selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 12: Create new resource type successfully
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.resourceTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.resourceTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Verify confirmation modal shows only Central and University
            ConfirmCreate.waitLoadingConfirmCreate(testData.resourceTypeName);

            // Step 13: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.resourceTypeName,
                `${[tenantNames.central, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Verify two rows created (Central and University)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.resourceTypeName,
              tenantNames.central,
              [
                testData.resourceTypeName,
                testData.resourceTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.resourceTypeName,
              tenantNames.university,
              [
                testData.resourceTypeName,
                testData.resourceTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 14: Edit central tenant resource type
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.resourceTypeName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is disabled in edit mode
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });

            // Step 15: Clear code field
            ConsortiaControlledVocabularyPaneset.clearTextField('code');

            // Step 16: Try to save with empty code field (validation error)
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              code: 'Please fill this in to continue',
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 17: Fill in new code value
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedResourceTypeCode,
            });

            // Step 18: Save changes
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.resourceTypeName, tenantNames.central),
            );

            // Verify only central tenant row was updated
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.resourceTypeName,
              tenantNames.central,
              [
                testData.resourceTypeName,
                testData.editedResourceTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            // Verify University tenant unchanged
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.resourceTypeName,
              tenantNames.university,
              [
                testData.resourceTypeName,
                testData.resourceTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 19: Delete resource type from University tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.resourceTypeName,
              tenantNames.university,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              CONSTANTS.SETTINGS_OPTION,
              testData.resourceTypeName,
            );

            // Step 20: Confirm deletion
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTINGS_OPTION, testData.resourceTypeName),
            );

            // Verify University tenant row was deleted, Central remains
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.resourceTypeName,
              tenantNames.university,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.resourceTypeName,
              tenantNames.central,
              [
                testData.resourceTypeName,
                testData.editedResourceTypeCode,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 21: Login as User B
            cy.login(userB.username, userB.password);

            // Step 22: Verify resource type in Central tenant Settings
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.RESOURCE_TYPES);
            ResourceTypes.waitLoading();
            ResourceTypes.verifyLocalResourceTypesInTheList({
              name: testData.resourceTypeName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 23: Switch to College tenant and verify NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.RESOURCE_TYPES);
            ResourceTypes.waitLoading();
            ResourceTypes.verifyResourceTypesAbsentInTheList({ name: testData.resourceTypeName });

            // Step 24: Switch to University tenant and verify NOT present (deleted)
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.RESOURCE_TYPES);
            ResourceTypes.waitLoading();
            ResourceTypes.verifyResourceTypesAbsentInTheList({ name: testData.resourceTypeName });
          },
        );
      });
    });
  });
});
