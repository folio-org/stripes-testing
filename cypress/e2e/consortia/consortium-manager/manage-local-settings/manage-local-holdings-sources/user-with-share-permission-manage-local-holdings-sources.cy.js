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
import HoldingsSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsSourcesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import HoldingsSources from '../../../../../support/fragments/settings/inventory/holdings/holdingsSources';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Holdings sources', () => {
        let user;
        const testData = {
          sourceName: `AT_C648483_HoldingsSource_${getRandomPostfix()}`,
          editedSourceName: `AT_C648483_HoldingsSource_${getRandomPostfix()}_edited`,
        };
        const capabSetsToAssignCentral = [
          CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
          CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
          CapabilitySets.uiInventorySettingsHoldingsSourcesView,
        ];
        const capabSetsToAssignMember = [CapabilitySets.uiInventorySettingsHoldingsSourcesView];

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([]).then((userProperties) => {
            user = userProperties;
            cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssignCentral);

            // Assign affiliation to College (member-1)
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssignMember);

            // Assign affiliation to University (member-2)
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssignMember);

            cy.resetTenant();
            cy.login(user.username, user.password);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);

          // Clean up holdings sources from all tenants
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenant) => {
              cy.setTenant(tenant);
              HoldingsSources.getHoldingsSourcesViaApi({
                query: `name="${testData.sourceName}"`,
              }).then((holdingsSources) => {
                holdingsSources.forEach((holdingsSource) => {
                  HoldingsSources.deleteViaApi(holdingsSource.id);
                });
              });
              HoldingsSources.getHoldingsSourcesViaApi({
                query: `name="${testData.editedSourceName}"`,
              }).then((holdingsSources) => {
                holdingsSources.forEach((holdingsSource) => {
                  HoldingsSources.deleteViaApi(holdingsSource.id);
                });
              });
            },
          );
        });

        it(
          'C648483 User with "Consortium manager: Can share settings to all members" permission is able to manage local holdings sources of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C648483'] },
          () => {
            // Step 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Holdings sources settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsSourcesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 3: Create new holdings source
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 4: Fill in name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.sourceName });

            // Step 5: Leave Share checkbox unchecked (local holdings source)
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 6: Save and verify confirmation modal
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.sourceName);

            // Step 7: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.sourceName,
                `${[tenantNames.central, tenantNames.college, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Steps 8-10: Verify three rows created (one for each tenant)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.central,
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.central],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.college,
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.college],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.university,
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.university],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 11: Edit central tenant holdings source
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.sourceName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 12: Edit name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedSourceName,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 13: Cancel editing
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.central,
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.central],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 14: Edit again and save
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.sourceName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedSourceName,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              `${testData.editedSourceName} was successfully updated for ${tenantNames.central} library.`,
            );

            // Verify only central tenant row was updated
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedSourceName,
              tenantNames.central,
              [
                testData.editedSourceName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            // Verify other tenants unchanged
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.college,
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.college],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.university,
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.university],
              [actionIcons.edit, actionIcons.trash],
            );

            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Steps 15-16: Delete holdings source from College tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.sourceName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('holdings source', testData.sourceName);
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted('holdings source', testData.sourceName),
            );

            // Verify College tenant row was deleted, others remain
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.sourceName,
              tenantNames.college,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedSourceName,
              tenantNames.central,
              [
                testData.editedSourceName,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.university,
              [testData.sourceName, 'local', `${moment().format('l')} by`, tenantNames.university],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 17: Verify in Settings app - Central tenant
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyLocalHoldingsSourcesInTheList({
              name: testData.editedSourceName,
              source: 'local',
              actons: [actionIcons.edit, actionIcons.trash],
            });

            // Step 18: Switch to College tenant and verify deletion
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyHoldingsSourcesAbsentInTheList({ name: testData.sourceName });

            // Step 19: Switch to University tenant and verify presence
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyLocalHoldingsSourcesInTheList({
              name: testData.sourceName,
              source: 'local',
              actons: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
