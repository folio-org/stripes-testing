import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import InstancesBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/instancesBulkEditProfileForm';
import InstancesBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/instancesBulkEditProfileView';
import SelectBulkEditProfileModal from '../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import { APPLICATION_NAMES, BULK_EDIT_ACTIONS } from '../../../support/constants';
import {
  createBulkEditProfileBody,
  createSuppressFromDiscoveryRule,
  InstancesRules,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

const { createSetRecordsForDeletionRule } = InstancesRules;

let user;
let adminUser;
const folioInstance = {
  title: `AT_C889718_FolioInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `validInstanceUUIDs_${getRandomPostfix()}.csv`;
const testData = {
  profileIds: [],
};
const folioProfileWithSetForDeletion = createBulkEditProfileBody({
  name: `AT_C889718_FOLIO_SetForDeletion_${getRandomPostfix()}`,
  description: 'FOLIO profile with Set for deletion',
  entityType: 'INSTANCE',
  ruleDetails: [createSetRecordsForDeletionRule(false)],
});
const marcProfileWithSetForDeletion = createBulkEditProfileBody({
  name: `AT_C889718_MARC_SetForDeletion_${getRandomPostfix()}`,
  description: 'MARC profile with Set for deletion',
  entityType: 'INSTANCE_MARC',
  ruleDetails: [createSetRecordsForDeletionRule(false)],
  marcRuleDetails: [],
});
const regularFolioProfile = createBulkEditProfileBody({
  name: `AT_C889718_FOLIO_Regular_${getRandomPostfix()}`,
  description: 'Regular FOLIO profile without Set for deletion',
  entityType: 'INSTANCE',
  ruleDetails: [createSuppressFromDiscoveryRule(false)],
});
const regularMarcProfile = createBulkEditProfileBody({
  name: `AT_C889718_MARC_Regular_${getRandomPostfix()}`,
  description: 'Regular MARC profile without Set for deletion',
  entityType: 'INSTANCE_MARC',
  ruleDetails: [createSuppressFromDiscoveryRule(false)],
  marcRuleDetails: [],
});

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.getAdminUserDetails().then((adminRecord) => {
        adminUser = adminRecord;

        // Create FOLIO profile with Set for deletion
        cy.createBulkEditProfile(folioProfileWithSetForDeletion).then((profile) => {
          testData.folioProfileWithDeletionName = profile.name;
          testData.folioProfileWithDeletionId = profile.id;
          testData.profileIds.push(profile.id);
        });

        // Create MARC profile with Set for deletion
        cy.createBulkEditProfile(marcProfileWithSetForDeletion).then((profile) => {
          testData.marcProfileWithDeletionName = profile.name;
          testData.marcProfileWithDeletionId = profile.id;
          testData.profileIds.push(profile.id);
        });

        // Create regular FOLIO profile without Set for deletion
        cy.createBulkEditProfile(regularFolioProfile).then((profile) => {
          testData.regularFolioProfileName = profile.name;
          testData.regularFolioProfileId = profile.id;
          testData.profileIds.push(profile.id);
        });

        // Create regular MARC profile without Set for deletion
        cy.createBulkEditProfile(regularMarcProfile).then((profile) => {
          testData.regularMarcProfileName = profile.name;
          testData.regularMarcProfileId = profile.id;
          testData.profileIds.push(profile.id);
        });
      });

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.bulkEditSettingsCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypeData[0].id,
              title: folioInstance.title,
            },
          }).then((createdInstanceData) => {
            folioInstance.instanceId = createdInstanceData.instanceId;

            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              folioInstance.instanceId,
            );

            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
              'Instances',
              'Instance UUIDs',
            );
            BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditSearchPane.verifyMatchedResults(folioInstance.title);
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(folioInstance.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));
    });

    it(
      'C889718 Profiles with "Set records for deletion" option are NOT available for selection in bulk edit without UI-Inventory Instance Set-Records-For-Deletion capability set (firebird)',
      { tags: ['criticalPath', 'firebird', 'C889718'] },
      () => {
        // Step 1: Click "Actions" menu and Click "Select FOLIO instances bulk edit profile"
        BulkEditActions.openActions();
        BulkEditActions.clickSelectBulkEditProfile('FOLIO instances');
        SelectBulkEditProfileModal.waitLoading('FOLIO instances');
        SelectBulkEditProfileModal.verifyAllModalElements();

        // Step 2: Verify listed FOLIO instances bulk edit profiles available for selection
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(
          testData.folioProfileWithDeletionName,
        );
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.regularFolioProfileName,
          'Regular FOLIO profile without Set for deletion',
          adminUser,
        );

        // Step 3: Click "X" button
        SelectBulkEditProfileModal.closeModal();
        SelectBulkEditProfileModal.verifyModalClosed('instances');
        BulkEditSearchPane.verifyMatchedResults(folioInstance.title);

        // Step 4: Click "Actions" menu and Click "Select instances with source MARC bulk edit profile"
        BulkEditActions.openActions();
        BulkEditActions.clickSelectBulkEditProfile('instances with source MARC');
        SelectBulkEditProfileModal.waitLoading('instances with source MARC');
        SelectBulkEditProfileModal.verifyAllModalElements();

        // Step 5: Verify listed instances with source MARC bulk edit profiles available for selection
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.marcProfileWithDeletionName);
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.regularMarcProfileName,
          'Regular MARC profile without Set for deletion',
          adminUser,
        );

        // Step 6: Click "X" button
        SelectBulkEditProfileModal.closeModal();
        SelectBulkEditProfileModal.verifyModalClosed('instances with source MARC');
        BulkEditSearchPane.verifyMatchedResults(folioInstance.title);

        // Step 7: Go to "Settings" > "Bulk edit" > "Instances bulk edit profiles"
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();
        BulkEditPane.clickInstancesBulkEditProfiles();
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 8: Click on the row with FOLIO instances bulk edit profile including "Set records for deletion"
        InstancesBulkEditProfilesPane.clickProfileRow(testData.folioProfileWithDeletionName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifySelectedOption('Select option');
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE);

        // Step 9: Click "Actions" menu button > "Edit"
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.selectEditProfile();
        InstancesBulkEditProfileForm.verifySelectedOption('Select option');
        InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE);

        // Step 10: Verify "Set records for deletion" is NOT available in "Select option" dropdown
        InstancesBulkEditProfileForm.clickOptionsSelection();
        InstancesBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(
          'Set records for deletion',
          false,
        );

        // Step 11: Click "X" button and click on the row with MARC profile including "Set records for deletion"
        InstancesBulkEditProfileForm.clickCloseFormButton();
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.clickProfileRow(testData.marcProfileWithDeletionName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifySelectedOption('Select option');
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE);

        // Step 12: Click "Actions" menu button > "Duplicate"
        InstancesBulkEditProfileView.clickActionsButton();
        InstancesBulkEditProfileView.selectDuplicateProfile();
        InstancesBulkEditProfileForm.waitLoadingMarcProfile();
        InstancesBulkEditProfileForm.verifySelectedOption('Select option');
        InstancesBulkEditProfileForm.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE);

        // Step 13: Verify "Set records for deletion" is NOT available in "Select option" dropdown
        InstancesBulkEditProfileForm.clickOptionsSelection();
        InstancesBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(
          'Set records for deletion',
          false,
        );
      },
    );
  });
});
