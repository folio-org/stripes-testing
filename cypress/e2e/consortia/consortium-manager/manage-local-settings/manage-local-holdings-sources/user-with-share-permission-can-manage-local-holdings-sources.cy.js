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
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Holdings sources', () => {
        let userA;
        let userB;
        const testData = {
          sourceName: `AT_C648485_HoldingsSource_${getRandomPostfix()}`,
          editedSourceName: `AT_C648485_HoldingsSource_${getRandomPostfix()}_edited`,
        };

        const CONSTANTS = {
          LOCAL_SOURCE: 'local',
          SETTING_NAME: 'holdings source',
        };

        // User A capability sets (share permission in Central, Organizations view in College, Holdings sources view in University)
        const capabSetsUserACentral = [
          CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
          CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
          CapabilitySets.uiInventorySettingsHoldingsSourcesView,
        ];
        const capabSetsUserACollege = [CapabilitySets.uiOrganizationsView];
        const capabSetsUserAUniversity = [CapabilitySets.uiInventorySettingsHoldingsSourcesView];

        // User B capability sets (holdings sources view in all tenants)
        const capabSetsUserB = [CapabilitySets.uiInventorySettingsHoldingsSourcesView];

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create User A in member-1 (College)
          cy.setTenant(Affiliations.College);
          cy.createTempUser([]).then((userProperties) => {
            userA = userProperties;
            cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsUserACollege);

            // Assign capabilitiy sets in Central
            cy.resetTenant();
            cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsUserACentral);

            // Assign User A affiliation to University and assign capability sets
            cy.assignAffiliationToUser(Affiliations.University, userA.userId);
            cy.setTenant(Affiliations.University);
            cy.assignCapabilitiesToExistingUser(userA.userId, [], capabSetsUserAUniversity);

            // Create User B in Central
            cy.resetTenant();
            cy.createTempUser([]).then((userBProperties) => {
              userB = userBProperties;
              cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsUserB);

              // Assign User B affiliations
              cy.assignAffiliationToUser(Affiliations.College, userB.userId);
              cy.setTenant(Affiliations.College);
              cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsUserB);

              cy.resetTenant();
              cy.assignAffiliationToUser(Affiliations.University, userB.userId);
              cy.setTenant(Affiliations.University);
              cy.assignCapabilitiesToExistingUser(userB.userId, [], capabSetsUserB);

              cy.resetTenant();
              cy.waitForAuthRefresh(() => {
                cy.login(userA.username, userA.password);
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                cy.reload();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              }, 20_000);
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);

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
          'C648485 User with "Consortium manager: Can share settings to all members" permission can manage local holdings sources via "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C648485'] },
          () => {
            // Steps 1: Navigate to Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Holdings sources and verify permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsSourcesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears for member-1
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Create new holdings source with permissions issue
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            // Verify Share checkbox is enabled
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 4: Fill in name field
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.sourceName });

            // Step 5: Leave Share checkbox unchecked
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 6: Try to save and verify error
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.clickSave();
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));
            // ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            //   name: 'Error on saving data',
            // });
            // ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 7: Cancel creation
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(testData.sourceName);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 8: Open Select members modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 9: Unselect member-1 tenant (College)
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 10: Save member selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 11: Create new holdings source successfully
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.sourceName });
            ConsortiaControlledVocabularyPaneset.clickSave();

            // Verify confirmation modal shows only Central and University
            ConfirmCreate.waitLoadingConfirmCreate(testData.sourceName);

            // Step 12: Confirm creation
            ConfirmCreate.clickConfirm();
            ConsortiumManagerApp.checkMessage(
              messages.created(
                testData.sourceName,
                `${[tenantNames.central, tenantNames.university].sort().join(', ')}`,
              ),
            );

            // Verify two rows created (Central and University)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.central,
              [
                testData.sourceName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.sourceName,
              tenantNames.university,
              [
                testData.sourceName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 13: Edit central tenant holdings source
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.sourceName,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            // Verify Share checkbox is disabled in edit mode
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });

            // Step 14: Clear name field
            ConsortiaControlledVocabularyPaneset.clearTextField('name');

            // Step 15: Try to save with empty name and verify validation error
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: 'Please fill this in to continue',
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 16: Fill in edited name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedSourceName,
            });

            // Step 17: Save changes
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
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 18: Delete holdings source from University tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.sourceName,
              tenantNames.university,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(CONSTANTS.SETTING_NAME, testData.sourceName);

            // Step 19: Confirm deletion
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CONSTANTS.SETTING_NAME, testData.sourceName),
            );

            // Verify University tenant row was deleted, Central remains
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.sourceName,
              tenantNames.university,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedSourceName,
              tenantNames.central,
              [
                testData.editedSourceName,
                CONSTANTS.LOCAL_SOURCE,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 20: Login as User B
            cy.login(userB.username, userB.password);

            // Step 21: Verify holdings source in Central tenant Settings
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyLocalHoldingsSourcesInTheList({
              name: testData.editedSourceName,
              source: CONSTANTS.LOCAL_SOURCE,
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 22: Switch to College tenant and verify NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyHoldingsSourcesAbsentInTheList({ name: testData.sourceName });

            // Step 23: Switch to University tenant and verify deleted holdings source NOT present
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyHoldingsSourcesAbsentInTheList({ name: testData.sourceName });
          },
        );
      });
    });
  });
});
