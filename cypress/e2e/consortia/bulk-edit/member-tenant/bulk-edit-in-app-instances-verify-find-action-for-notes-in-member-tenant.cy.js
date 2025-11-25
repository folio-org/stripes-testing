import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
let reproductionNoteTypeId;
const folioInstance = {
  title: `AT_C566136_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566136_MarcInstance_${getRandomPostfix()}`,
};
const notes = {
  adminUpper: 'Te;st: [administrative] no*te',
  adminLower: 'te;st: [administrative] no*te',
  reproductionUpper: 'Test instance note',
  reproductionLower: 'test instance note',
};
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '533',
    content: `$a ${notes.reproductionUpper}`,
    indicators: ['\\', '\\'],
  },
];
const instances = [folioInstance, marcInstance];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
const errorReason = ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED;

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        cy.createTempUser().then((userProperties) => {
          user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: [
              permissions.bulkEditEdit.gui,
              permissions.uiInventoryViewCreateEditInstances.gui,
            ],
          });
          cy.withinTenant(Affiliations.College, () => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            });
            InstanceNoteTypes.getInstanceNoteTypesViaApi({
              limit: 1,
              query: 'name=="Reproduction note"',
            })
              .then(({ instanceNoteTypes }) => {
                reproductionNoteTypeId = instanceNoteTypes[0].id;
              })
              .then(() => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                    administrativeNotes: [notes.adminUpper, notes.adminLower],
                    notes: [
                      {
                        instanceNoteTypeId: reproductionNoteTypeId,
                        note: notes.reproductionUpper,
                        staffOnly: true,
                      },
                      {
                        instanceNoteTypeId: reproductionNoteTypeId,
                        note: notes.reproductionLower,
                        staffOnly: false,
                      },
                    ],
                  },
                }).then((createdInstanceData) => {
                  folioInstance.uuid = createdInstanceData.instanceId;

                  cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                    folioInstance.hrid = instanceData.hrid;
                  });

                  cy.createMarcBibliographicViaAPI(
                    QuickMarcEditor.defaultValidLdr,
                    marcInstanceFields,
                  ).then((instanceId) => {
                    marcInstance.uuid = instanceId;

                    cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                      marcInstance.hrid = instanceData.hrid;
                      instanceData.administrativeNotes = [notes.adminUpper, notes.adminLower];

                      cy.updateInstance(instanceData);

                      FileManager.createFile(
                        `cypress/fixtures/${instanceUUIDsFileName}`,
                        `${folioInstance.uuid}\n${marcInstance.uuid}`,
                      );
                    });
                  });
                });
              });
          });

          cy.resetTenant();
          cy.login(user.username, user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.withinTenant(Affiliations.College, () => {
          instances.forEach((instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          });
        });
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566136 Verify "Find" action for Instances notes in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566136'] },
        () => {
          // Step 1-3: Upload UUIDs and verify preview
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instance.hrid,
            );
          });

          BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

          // Step 4: Download matched records
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              fileNames.matchedRecordsCSV,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
              instance.uuid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
              instance.hrid,
            );
          });

          // Step 5-10: Open in-app bulk edit form and perform Find/Replace for upper-case admin note
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditForm();
          BulkEditActions.noteReplaceWith(
            'Administrative note',
            notes.adminUpper,
            notes.adminLower,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 11-12: Add row for Reproduction note, Find/Replace for upper-case
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow();
          BulkEditActions.noteReplaceWith(
            'Reproduction note',
            notes.reproductionUpper,
            notes.reproductionLower,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 13: Confirm changes
          BulkEditActions.confirmChanges();

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              `${notes.adminLower} | ${notes.adminLower}`,
            );
          });

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            notes.reproductionLower,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            folioInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            `${notes.reproductionLower} (staff only) | ${notes.reproductionLower}`,
          );
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);

          // Step 14: Download preview
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                value: `${notes.adminLower} | ${notes.adminLower}`,
              },
              {
                header: 'Notes',
                value: `Reproduction note;${notes.reproductionLower};true|Reproduction note;${notes.reproductionLower};false`,
              },
            ],
          );
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                value: `${notes.adminLower} | ${notes.adminLower}`,
              },
              {
                header: 'Notes',
                value: `Reproduction note;${notes.reproductionLower};false`,
              },
            ],
          );

          // Step 15: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);
          BulkEditSearchPane.verifyPaginatorInChangedRecords(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              `${notes.adminLower} | ${notes.adminLower}`,
            );
          });

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            notes.reproductionUpper,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            folioInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            `${notes.reproductionLower} (staff only) | ${notes.reproductionLower}`,
          );

          // Step 16: Verify error for MARC Instance
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyError(marcInstance.uuid, errorReason);

          // Step 17: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                value: `${notes.adminLower} | ${notes.adminLower}`,
              },
              {
                header: 'Notes',
                value: `Reproduction note;${notes.reproductionLower};true|Reproduction note;${notes.reproductionLower};false`,
              },
            ],
          );
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                value: `${notes.adminLower} | ${notes.adminLower}`,
              },
              {
                header: 'Notes',
                value: `Reproduction note;${notes.reproductionUpper};false`,
              },
            ],
          );

          // Step 18: Download errors
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `ERROR,${marcInstance.uuid},${errorReason}`,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.errorsFromCommitting, 1);

          // Step 19: Inventory app verification
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          cy.wait(3000);
          InstanceRecordView.verifyInstaneceAdministrativeNoteByRow(notes.adminLower);
          InstanceRecordView.verifyInstaneceAdministrativeNoteByRow(notes.adminLower, 1);
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            notes.reproductionUpper,
          );
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          cy.wait(3000);
          InstanceRecordView.verifyInstaneceAdministrativeNoteByRow(notes.adminLower);
          InstanceRecordView.verifyInstaneceAdministrativeNoteByRow(notes.adminLower, 1);
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'Yes',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            notes.reproductionLower,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            notes.reproductionLower,
            1,
          );

          // Step 20: Repeat with lower-case Find/Remove
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
          BulkEditActions.openActions();
          BulkEditActions.openStartBulkEditFolioInstanceForm();

          // Step 21: Find/Remove for lower-case admin note
          BulkEditActions.noteRemove(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            notes.adminLower,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 22: Find/Remove for lower-case reproduction note
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.noteRemove(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            notes.reproductionLower,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 23: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);
          BulkEditSearchPane.verifyPaginatorInChangedRecords(2);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              ' | ',
            );
          });

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            folioInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            'null (staff only) | null',
          );

          // Step 24: Verify error for MARC Instance
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyError(marcInstance.uuid, errorReason);

          // Step 25: Download preview
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            folioInstance.uuid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
                value: '|',
              },
              {
                header: 'Notes',
                value: 'Reproduction note;;true|Reproduction note;;false',
              },
            ],
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            'Notes',
            `Reproduction note;${notes.reproductionUpper};false`,
          );

          // Step 26: Download errors
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `ERROR,${marcInstance.uuid},${errorReason}`,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.errorsFromCommitting, 1);

          // Step 27: Inventory app verification for removals
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          cy.wait(3000);
          InstanceRecordView.verifyInstaneceAdministrativeNoteByRow('No value set-');
          InstanceRecordView.verifyInstaneceAdministrativeNoteByRow('No value set-', 1);
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            notes.reproductionUpper,
          );
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          cy.wait(3000);
          InstanceRecordView.verifyInstaneceAdministrativeNoteByRow('No value set-');
          InstanceRecordView.verifyInstaneceAdministrativeNoteByRow('No value set-', 1);
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'Yes',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            'No value set-',
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            'No value set-',
            1,
          );
        },
      );
    });
  });
});
