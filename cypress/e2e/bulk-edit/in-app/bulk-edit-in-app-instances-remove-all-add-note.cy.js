import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  INSTANCE_NOTE_IDS,
} from '../../../support/constants';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
const errorsFromCommittingFileName =
  BulkEditFiles.getErrorsFromCommittingFileName(instanceUUIDsFileName);
const folioItem = {
  instanceName: `AT_C468192_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  instanceName: `AT_C468192_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const notes = {
  dissertationNote: 'test instance note',
  dissertationNoteStaffOnly: 'test instance note staff only',
  dataQualityNote: 'data quality note',
  exhibitionsNote: 'exhibitions note',
  administrativeNote: 'administrative note',
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
];
const reasonForError = ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED;

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
            });

            cy.getInstanceById(folioItem.instanceId).then((body) => {
              folioItem.hrid = body.hrid;
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
              ];
              cy.updateInstance(body);
            });

            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              `${folioItem.instanceId}\n${marcInstance.instanceId}`,
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
      'C468192 Verify Bulk Edit actions for Instance notes - remove all and add note (firebird)',
      { tags: ['criticalPath', 'firebird', 'C468192'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.downloadMatchedResults();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Instance UUID');
        ExportFile.verifyFileIncludes(matchedRecordsFileName, [
          folioItem.instanceId,
          marcInstance.instanceId,
        ]);
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.noteRemoveAll('Dissertation note');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Data quality note', notes.dataQualityNote, 1);
        BulkEditActions.verifyStaffOnlyCheckbox(false, 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Exhibitions note', notes.exhibitionsNote, 2);
        BulkEditActions.checkStaffOnlyCheckbox(2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.addItemNote('Administrative note', notes.administrativeNote, 3);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '2 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        [0, 1].forEach((row) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow('Dissertation note', '', row);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
            'Administrative note',
            notes.administrativeNote,
            row,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
            'Data quality note',
            notes.dataQualityNote,
            row,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
            'Exhibitions note',
            `${notes.exhibitionsNote} (staff only)`,
            row,
          );
        });

        const headerValueToEdit = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            value: notes.administrativeNote,
          },
          {
            header: 'Notes',
            value: `Data quality note;${notes.dataQualityNote};false|Exhibitions note;${notes.exhibitionsNote};true`,
          },
        ];

        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          folioItem.instanceId,
          headerValueToEdit,
        );
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.instanceId,
          headerValueToEdit,
        );
        ExportFile.verifyFileIncludes(previewFileName, ['Dissertation note'], false);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioItem.hrid,
          'Dissertation note',
          '',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          'Dissertation note',
          notes.dissertationNote,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRowInPreviewRecordsChanged(
          'Administrative note',
          notes.administrativeNote,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRowInPreviewRecordsChanged(
          'Administrative note',
          notes.administrativeNote,
          1,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioItem.hrid,
          'Data quality note',
          notes.dataQualityNote,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          folioItem.hrid,
          'Exhibitions note',
          `${notes.exhibitionsNote} (staff only)`,
        );

        BulkEditSearchPane.verifyErrorLabel(3);
        BulkEditSearchPane.verifyNonMatchedResults(marcInstance.instanceId, `${reasonForError} `);
        BulkEditSearchPane.verifyReasonForError(reasonForError);

        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(previewFileName, [
          [`${folioItem.hrid},FOLIO,,,,,${notes.administrativeNote}`],
        ]);
        ExportFile.verifyFileIncludes(previewFileName, [
          [
            `Data quality note;${notes.dataQualityNote};false|Exhibitions note;${notes.exhibitionsNote};true`,
          ],
        ]);
        ExportFile.verifyFileIncludes(previewFileName, ['Dissertation note'], false);

        BulkEditActions.downloadErrors();
        BulkEditFiles.verifyCSVFileRows(errorsFromCommittingFileName, [
          `${marcInstance.instanceId},${reasonForError}`,
          `${marcInstance.instanceId},${reasonForError}`,
          `${marcInstance.instanceId},${reasonForError}`,
        ]);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(folioItem.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(notes.administrativeNote);
        InventoryInstance.checkInstanceNotes('Data quality note', notes.dataQualityNote);
        InventoryInstance.checkInstanceNotes('Exhibitions note', notes.exhibitionsNote);
        ItemRecordView.verifyTextAbsent('Dissertation note');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.instanceName);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(notes.administrativeNote);
        InventoryInstance.checkInstanceNotes('Dissertation note', notes.dissertationNote);
        ItemRecordView.verifyTextAbsent('Data quality note');
        ItemRecordView.verifyTextAbsent('Exhibitions note');
      },
    );
  });
});
