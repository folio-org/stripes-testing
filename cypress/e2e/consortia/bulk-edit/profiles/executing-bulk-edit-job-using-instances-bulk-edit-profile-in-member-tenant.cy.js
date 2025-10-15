import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import FileManager from '../../../../support/utils/fileManager';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  InstancesRules,
  ActionCreators,
} from '../../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

const { createInstanceNoteRule, createStatisticalCodeRule } = InstancesRules;

// Profile factory functions
const createMainProfileBody = (accessibilityNoteTypeId, actionNoteTypeId) => {
  return createBulkEditProfileBody({
    name: `AT_C773246_InstancesProfile_${getRandomPostfix()}`,
    description: 'Test instances bulk edit profile for executing bulk edit job in member tenant',
    entityType: 'INSTANCE',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.removeAll()),
      createStatisticalCodeRule(ActionCreators.removeAll()),
      createInstanceNoteRule(ActionCreators.markAsStaffOnly(), accessibilityNoteTypeId),
      createInstanceNoteRule(ActionCreators.removeMarkAsStaffOnly(), actionNoteTypeId),
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_InstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for testing search and sort functionality',
    entityType: 'INSTANCE',
    ruleDetails: [createAdminNoteRule(ActionCreators.findAndRemove('test'))],
  });
};

const testData = {
  folioInstance: {
    title: `AT_C773246_FolioInstance_${getRandomPostfix()}`,
  },
  profileIds: [],
  administrativeNote: 'admin note for testing',
  accessibilityNote: 'Accessibility note for testing',
  actionNote: 'Action note for testing',
};

const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.getAdminUserDetails().then((record) => {
            testData.adminSourceRecord = record;
          });

          // Get note type IDs
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            query: 'name="Accessibility note"',
          }).then((accessibilityNoteType) => {
            testData.accessibilityNoteTypeId = accessibilityNoteType.instanceNoteTypes[0].id;

            InstanceNoteTypes.getInstanceNoteTypesViaApi({
              query: 'name="Action note"',
            }).then((actionNoteType) => {
              testData.actionNoteTypeId = actionNoteType.instanceNoteTypes[0].id;

              cy.getStatisticalCodes({ limit: 1 }).then((codes) => {
                testData.statisticalCodeId = codes[0].id;
                testData.statisticalCodeName = codes[0].name;

                cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                  testData.instanceTypeId = instanceTypeData[0].id;

                  // Create FOLIO instance with required data
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: testData.instanceTypeId,
                      title: testData.folioInstance.title,
                      administrativeNotes: [testData.administrativeNote],
                      notes: [
                        {
                          instanceNoteTypeId: testData.accessibilityNoteTypeId,
                          note: testData.accessibilityNote,
                          staffOnly: false,
                        },
                        {
                          instanceNoteTypeId: testData.actionNoteTypeId,
                          note: testData.actionNote,
                          staffOnly: true,
                        },
                      ],
                      statisticalCodeIds: [testData.statisticalCodeId],
                    },
                  }).then((instance) => {
                    testData.folioInstance.uuid = instance.instanceId;

                    cy.getInstanceById(testData.folioInstance.uuid).then((folioInstance) => {
                      testData.folioInstance.hrid = folioInstance.hrid;
                    });

                    // Create CSV file with instance UUID
                    FileManager.createFile(
                      `cypress/fixtures/${instanceUUIDsFileName}`,
                      testData.folioInstance.uuid,
                    );
                  });

                  // Create profiles using factory functions
                  const mainProfile = createMainProfileBody(
                    testData.accessibilityNoteTypeId,
                    testData.actionNoteTypeId,
                  );
                  testData.profileDescription = mainProfile.description;

                  const secondProfile = createSecondProfileBody();
                  testData.secondProfileDescription = secondProfile.description;

                  cy.createBulkEditProfile(mainProfile).then((profile) => {
                    testData.profileName = profile.name;
                    testData.profileIds.push(profile.id);
                  });
                  cy.createBulkEditProfile(secondProfile).then((profile) => {
                    testData.secondProfileName = profile.name;
                    testData.profileIds.push(profile.id);
                  });
                });
              });
            });
          });
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.setTenant(Affiliations.College);

        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

        InventoryInstance.deleteInstanceViaApi(testData.folioInstance.uuid);
        FileManager.deleteFile(`cypress/downloads/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      // Trillium
      it.skip(
        'C773246 ECS | Executing bulk edit job using FOLIO Instance bulk edit profile in Member tenant (Logs) (consortia) (firebird)',
        { tags: [] },
        () => {
          // Step 1: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false, true);

          // Step 2: In the list of available column names uncheck checkboxes next to the options
          // that are going to be edited based on the bulk edit profile
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
          );

          // Step 3: Click "Select instances bulk edit profile"
          BulkEditActions.clickSelectBulkEditProfile('FOLIO instances');
          SelectBulkEditProfileModal.waitLoading('FOLIO instances');
          SelectBulkEditProfileModal.verifyAllModalElements();

          // Step 4-5: Verify the table with the list of existing instances bulk edit profiles
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfilesFoundText();
          SelectBulkEditProfileModal.verifyProfilesSortedByName();
          SelectBulkEditProfileModal.changeSortOrderByName();
          SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
          SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
          SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
          SelectBulkEditProfileModal.searchProfile('at_C773246');
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
          SelectBulkEditProfileModal.searchProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);

          // Step 6: Click on the row with FOLIO Instance bulk edit profile from Preconditions
          SelectBulkEditProfileModal.selectProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyModalClosed('FOLIO instances');
          BulkEditActions.verifyAreYouSureForm(1);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCESSIBILITY_NOTE,
              value: `${testData.accessibilityNote} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
              value: testData.actionNote,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            testData.folioInstance.hrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 7: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();

          const editedHeaderValuesInFile = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
              value: '',
            },
            {
              header: 'Notes',
              value: `Accessibility note;${testData.accessibilityNote};true|Action note;${testData.actionNote};false`,
            },
          ];

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.folioInstance.hrid,
            editedHeaderValuesInFile,
          );

          // Step 8: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            testData.folioInstance.hrid,
            editedHeaderValues,
          );

          // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.folioInstance.hrid,
            editedHeaderValuesInFile,
          );

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);

          // Step 10: Click "Logs" toggle in "Set criteria" pane
          // Check "Inventory - instances" checkbox under "Record types" accordion
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.clickActionsRunBy(testData.user.username);

          // Step 11: Click on the "..." action element in the row with recently completed bulk edit job
          BulkEditLogs.verifyLogsRowActionWhenCompleted();

          // Step 12: Click on the "File that was used to trigger the bulk edit"
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(instanceUUIDsFileName, [testData.folioInstance.uuid]);

          // Step 13: Click on the "File with the matching records" hyperlink
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            testData.folioInstance.uuid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            testData.folioInstance.uuid,
          );

          // Step 14: Click on the "File with the preview of proposed changes (CSV)" hyperlink
          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.folioInstance.hrid,
            editedHeaderValuesInFile,
          );

          // Step 15: Click on the "File with updated records (CSV)" hyperlink
          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            testData.folioInstance.hrid,
            editedHeaderValuesInFile,
          );

          // Step 16: Navigate to the "Inventory" app, Search for the recently edited FOLIO Instances
          // Verify that made changes have been applied
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.byKeywords(testData.folioInstance.title);
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceAdministrativeNote('-');
          InstanceRecordView.verifyStatisticalCodeTypeAndName('No value set-', 'No value set-');
          InstanceRecordView.checkNotesByType(
            0,
            'Accessibility note',
            testData.accessibilityNote,
            'Yes',
          );
          InstanceRecordView.checkNotesByType(1, 'Action note', testData.actionNote, 'No');
        },
      );
    });
  });
});
