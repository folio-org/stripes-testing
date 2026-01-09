import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  INSTANCE_NOTE_IDS,
} from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

let user;
const notes = {
  adminNote: 'adminNote',
  reproductionNote: 'Instance reproduction note',
  reproductionNoteStaffOnly: 'Instance reproduction note Staff only',
};
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const folioItem = {
  instanceName: `AT_C468191_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  instanceName: `AT_C468191_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const reasonForError = ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED;
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
    tag: '533',
    content: `$a ${notes.reproductionNote}`,
    indicators: ['\\', '\\'],
  },
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;
        folioItem.instanceId = InventoryInstances.createInstanceViaApi(
          folioItem.instanceName,
          folioItem.itemBarcode,
        );
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.instanceId = instanceId;

            cy.getInstanceById(marcInstance.instanceId).then((body) => {
              marcInstance.hrid = body.hrid;
              body.administrativeNotes = [notes.adminNote];
              cy.updateInstance(body);
            });

            cy.getInstanceById(folioItem.instanceId).then((body) => {
              folioItem.hrid = body.hrid;
              body.administrativeNotes = [notes.adminNote];
              body.notes = [
                {
                  instanceNoteTypeId: INSTANCE_NOTE_IDS.REPRODUCTION_NOTE,
                  note: notes.reproductionNote,
                  staffOnly: false,
                },
                {
                  instanceNoteTypeId: INSTANCE_NOTE_IDS.REPRODUCTION_NOTE,
                  note: notes.reproductionNoteStaffOnly,
                  staffOnly: true,
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioItem.itemBarcode);
      InventoryInstance.deleteInstanceViaApi(marcInstance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        errorsFromCommittingFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C468191 Verify Bulk Edit actions for Instance notes - change note type to other group (firebird)',
      { tags: ['criticalPath', 'firebird', 'C468191'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Instance UUID',
          'Administrative note',
          'Reproduction note',
          'With note',
        );
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          folioItem.instanceId,
          marcInstance.instanceId,
        ]);
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.changeNoteType('Administrative note', 'With note');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.changeNoteType('Reproduction note', 'Administrative note', 1);
        BulkEditActions.confirmChanges();

        const editedHeadrValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
            value: notes.adminNote,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
            value: '',
          },
        ];

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          folioItem.hrid,
          [
            ...editedHeadrValues,
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: `${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly}`,
            },
          ],
        );
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          marcInstance.hrid,
          [
            ...editedHeadrValues,
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: notes.reproductionNote,
            },
          ],
        );
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          'Instance UUID',
          folioItem.instanceId,
          [
            {
              header: 'Notes',
              value: `With note;${notes.adminNote};false`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: `${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly}`,
            },
          ],
        );
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          'Instance UUID',
          marcInstance.instanceId,
          [
            {
              header: 'Notes',
              value: `With note;${notes.adminNote};false`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: notes.reproductionNote,
            },
          ],
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyCellWithContentAbsentsInChangesAccordion(
          marcInstance.hrid,
          marcInstance.instanceName,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumns('With note', notes.adminNote);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Reproduction note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Administrative note',
          `${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly}`,
        );
        BulkEditSearchPane.verifyErrorLabel(2);
        BulkEditSearchPane.verifyReasonForError(reasonForError);
        BulkEditSearchPane.verifyReasonForError(
          ERROR_MESSAGES.ADMINISTRATIVE_NOTES_NOT_SUPPORTED_FOR_MARC,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
          `ERROR,${marcInstance.instanceId},${reasonForError}`,
        ]);
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsFileName,
          'Instance UUID',
          folioItem.instanceId,
          [
            {
              header: 'Notes',
              value: `With note;${notes.adminNote};false`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: `${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly}`,
            },
          ],
        );
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(changedRecordsFileName, 1);
        ExportFile.verifyFileIncludes(changedRecordsFileName, ['Reproduction note'], false);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(folioItem.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(
          `${notes.reproductionNote}\n${notes.reproductionNoteStaffOnly}`,
        );
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'No',
          'With note',
          notes.adminNote,
        );
        ItemRecordView.verifyTextAbsent('Reproduction note');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(notes.adminNote);
        InventoryInstance.checkInstanceNotes('Reproduction note', notes.reproductionNote);
      },
    );
  });
});
