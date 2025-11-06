import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import InstancesBulkEditProfileForm from '../../../support/fragments/settings/bulk-edit/profileForm/instancesBulkEditProfileForm';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
const folioInstance = {
  title: `AT_C831964_FolioInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `validInstanceUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
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
    });

    it(
      'C831964 "Set records for deletion" option is NOT available on bulk edit form without UI-Inventory Instance Set-Records-For-Deletion capability set (firebird)',
      { tags: ['criticalPath', 'firebird', 'C831964'] },
      () => {
        // Step 1: Click "Actions" menu and select "FOLIO Instances"
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 2: Expand "Select option" dropdown and verify "Set records for deletion" is NOT available
        BulkEditActions.clickOptionsSelection();

        const availableOptionsInFolioInstance = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_USE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
            .ADDITIONAL_PHYSICAL_FORM_AVAILABLE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.AWARDS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIBLIOGRAPHY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BINDING_INFORMATION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CARTOGRAPHIC_MATHEMATICAL_DATA,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CASE_FILE_CHARACTERISTICS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CITATION_REFERENCES_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CREATION_PRODUCTION_CREDITS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.CUMULATIVE_INDEX_FINDING_AIDS_NOTES,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATA_QUALITY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DATE_TIME_PLACE_EVENT_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ENTITY_ATTRIBUTE_INFORMATION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.EXHIBITIONS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMATTED_CONTENTS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FORMER_TITLE_COMPLEXITY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GEOGRAPHIC_COVERAGE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.IMMEDIATE_SOURCE_ACQUISITION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_ABOUT_DOCUMENTATION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INFORMATION_RELATED_COPYRIGHT_STATUS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ISSUING_BODY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LINKING_ENTRY_COMPLEXITY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCAL_NOTES,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCATION_ORIGINALS_DUPLICATES_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LOCATION_OTHER_ARCHIVAL_MATERIALS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.METHODOLOGY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.NUMBERING_PECULIARITIES_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ORIGINAL_VERSION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.OWNERSHIP_CUSTODIAL_HISTORY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.PARTICIPANT_PERFORMER_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
            .PREFERRED_CITATION_DESCRIBED_MATERIALS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
            .PUBLICATIONS_ABOUT_DESCRIBED_MATERIALS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESTRICTIONS_ACCESS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SCALE_NOTE_GRAPHIC_MATERIAL,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE_DESCRIPTION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STUDY_PROGRAM_INFORMATION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUMMARY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPLEMENT_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SYSTEM_DETAILS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TARGET_AUDIENCE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TERMS_GOVERNING_USE_REPRODUCTION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TYPE_COMPUTER_FILE_DATA_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.TYPE_REPORT_PERIOD_COVERED_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
        ];

        availableOptionsInFolioInstance.forEach((option) => {
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(option);
        });

        BulkEditActions.verifyOptionExistsInSelectOptionDropdown('Set records for deletion', false);

        // Step 3: Click "Cancel" button
        BulkEditActions.closeBulkEditInAppForm();
        BulkEditSearchPane.verifyMatchedResults(folioInstance.title);

        // Step 4: Click "Actions" menu and select "Instances with source MARC"
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 5: Under "Bulk edits for administrative data" accordion, verify "Set records for deletion" is NOT available
        BulkEditActions.clickOptionsSelection();

        const availableOptionsInMarcInstance = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        ];

        availableOptionsInMarcInstance.forEach((option) => {
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(option);
        });

        BulkEditActions.verifyOptionExistsInSelectOptionDropdown('Set records for deletion', false);

        // Step 6: Go to "Settings" > "Bulk edit" > "Instances bulk edit profiles"
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();
        BulkEditPane.clickInstancesBulkEditProfiles();
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 7: Click "Actions" menu button and select "New FOLIO instances bulk edit profile"
        InstancesBulkEditProfilesPane.clickActionsButton();
        InstancesBulkEditProfilesPane.selectNewFolioInstancesProfile();
        InstancesBulkEditProfileForm.waitLoading();

        // Step 8: Under "Bulk edits" accordion, verify "Set records for deletion" is NOT available
        InstancesBulkEditProfileForm.clickOptionsSelection();

        availableOptionsInFolioInstance.forEach((option) => {
          InstancesBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(option);
        });

        InstancesBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(
          'Set records for deletion',
          false,
        );

        // Step 9: Click "X" button
        InstancesBulkEditProfileForm.clickCloseFormButton();
        InstancesBulkEditProfileForm.verifyNewProfilePaneAbsent();
        InstancesBulkEditProfilesPane.waitLoading();

        // Step 10: Click "Actions" menu button and select "New instances with source MARC bulk edit profile"
        InstancesBulkEditProfilesPane.clickActionsButton();
        InstancesBulkEditProfilesPane.selectNewMarcInstancesProfile();
        InstancesBulkEditProfileForm.waitLoadingMarcProfile();

        // Step 11: Under "Bulk edits for administrative data" accordion, verify "Set records for deletion" is NOT available
        InstancesBulkEditProfileForm.clickOptionsSelection();

        availableOptionsInMarcInstance.forEach((option) => {
          InstancesBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(option);
        });

        InstancesBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(
          'Set records for deletion',
          false,
        );
      },
    );
  });
});
