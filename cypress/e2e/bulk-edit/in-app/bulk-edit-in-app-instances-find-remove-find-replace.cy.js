import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  INSTANCE_NOTE_IDS,
} from '../../../support/constants';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(instanceUUIDsFileName);
const folioItem = {
  instanceName: `AT_C468214_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  instanceName: `AT_C468214_MArcInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const newReproductionNote = 'NEW reproduction note  ~,!,@,#,$,%,^,&,(,),~,{.[,]<},>,ø, Æ, §,';
const notes = {
  dissertationNote: 'Test instance note',
  dissertationNoteStaffOnly: 'test instance note',
  reproductionNote: 'reproduction note',
};
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstance.instanceName}`,
    indicators: ['1', '0'],
  },
  {
    tag: '502',
    content: `$a ${notes.dissertationNote}`,
    indicators: ['\\', '\\'],
  },
  {
    tag: '533',
    content: `$a ${notes.reproductionNote}`,
    indicators: ['\\', '\\'],
  },
];
const errorReason = 'Bulk edit of instance notes is not supported for MARC Instances.';

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.enableStaffSuppressFacet.gui,
      ]).then((userProperties) => {
        user = userProperties;
        folioItem.instanceId = InventoryInstances.createInstanceViaApi(
          folioItem.instanceName,
          folioItem.itemBarcode,
        );
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.instanceId = instanceId;

            cy.getInstanceById(folioItem.instanceId).then((body) => {
              body.notes = [
                {
                  instanceNoteTypeId: INSTANCE_NOTE_IDS.DISSERTATION_NOTE,
                  note: notes.dissertationNote,
                  staffOnly: false,
                },
                {
                  instanceNoteTypeId: INSTANCE_NOTE_IDS.DISSERTATION_NOTE,
                  note: notes.dissertationNoteStaffOnly,
                  staffOnly: true,
                },
                {
                  instanceNoteTypeId: INSTANCE_NOTE_IDS.REPRODUCTION_NOTE,
                  note: notes.reproductionNote,
                  staffOnly: false,
                },
              ];
              cy.updateInstance(body);
            });

            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              `${marcInstance.instanceId}\n${folioItem.instanceId}`,
            );
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioItem.itemBarcode);
      InventoryInstance.deleteInstanceViaApi(marcInstance.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
        errorsFromCommittingFileName,
      );
    });

    it(
      'C468214 Verify Bulk Edit actions for Instance notes - find-replace and find-remove (firebird)',
      { tags: ['criticalPath', 'firebird', 'C468214'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Instance UUID', 'Source');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Source', 'FOLIO');
        BulkEditSearchPane.verifyExactChangesUnderColumns('Source', 'MARC');
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          folioItem.instanceId,
          marcInstance.instanceId,
        ]);
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.noteRemove('Dissertation note', 'Test');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.noteReplaceWith(
          'Reproduction note',
          notes.reproductionNote,
          newReproductionNote,
          1,
        );
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Staff suppress', 2);
        BulkEditSearchPane.verifyInputLabel('Staff suppress', 2);
        BulkEditActions.selectSecondAction('Set true', 2);
        BulkEditActions.addNewBulkEditFilterString();
        const suppressFromDiscovery = true;
        BulkEditActions.editSuppressFromDiscovery(suppressFromDiscovery, 3);
        BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(true);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          folioItem.instanceId,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              value: ` instance note | ${notes.dissertationNoteStaffOnly} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              value: newReproductionNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'true',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'true',
            },
          ],
        );
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          marcInstance.instanceId,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              value: ' instance note',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              value: newReproductionNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'true',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'true',
            },
          ],
        );

        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          folioItem.instanceId,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: true,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: true,
            },
            {
              header: 'Notes',
              value: `Dissertation note; instance note;false|Dissertation note;${notes.dissertationNoteStaffOnly};true|Reproduction note;${newReproductionNote};false`,
            },
          ],
        );
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.instanceId,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: true,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: true,
            },
            {
              header: 'Notes',
              value: `Dissertation note; instance note;false|Reproduction note;${newReproductionNote};false`,
            },
          ],
        );

        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          folioItem.instanceId,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              value: ` instance note | ${notes.dissertationNoteStaffOnly} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              value: newReproductionNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'true',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'true',
            },
          ],
        );
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          marcInstance.instanceId,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
              value: notes.dissertationNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
              value: notes.reproductionNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: 'true',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: 'true',
            },
          ],
        );
        BulkEditSearchPane.verifyErrorLabel(2);
        BulkEditSearchPane.verifyError(marcInstance.instanceId, errorReason);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          folioItem.instanceId,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: true,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: true,
            },
            {
              header: 'Notes',
              value: `Dissertation note; instance note;false|Dissertation note;${notes.dissertationNoteStaffOnly};true|Reproduction note;${newReproductionNote};false`,
            },
          ],
        );
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.instanceId,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
              value: true,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
              value: true,
            },
            {
              header: 'Notes',
              value: `Dissertation note;${notes.dissertationNote};false|Reproduction note;${notes.reproductionNote};false`,
            },
          ],
        );
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
          `ERROR,${marcInstance.instanceId},${errorReason}`,
          `ERROR,${marcInstance.instanceId},${errorReason}`,
        ]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.selectYesfilterStaffSuppress('Yes');
        InventorySearchAndFilter.searchInstanceByTitle(folioItem.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'No',
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
          ' instance note',
        );
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'Yes',
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
          notes.dissertationNoteStaffOnly,
          1,
        );
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          1,
          'No',
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
          newReproductionNote,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.selectYesfilterStaffSuppress('Yes');
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'No',
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
          notes.dissertationNote,
        );
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          1,
          'No',
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
          notes.reproductionNote,
        );
      },
    );
  });
});
