import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane, {
  instanceIdentifiers,
  instanceNotesColumnNames,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceNoteTypes from '../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
let noteTypeId;
const instance = {
  title: `C468183 folio instance-${getRandomPostfix()}`,
};
const noteTypes = {
  bibliographyNote: 'Bibliography note',
  administrativeNote: 'Administrative note',
  publicationsAboutDescribedMaterialsNote: 'Publications About Described Materials note',
  withNote: 'With note',
};
const noteTexts = {
  bibliographyNote: 'test bibliography note',
  bibliographyNote2: 'test bibliography note2',
  administrativeNote: 'test administrative note',
  publicationsNote:
    'test publications about described materials note ~,!,@,#,$,%,^,&,*,(,),~,, {.[,]<},>,ø, Æ, §,',
  withNote: 'test with note',
};
const actionsToSelect = {
  addNote: 'Add note',
};
const actionOptions = [
  'Add note',
  'Change note type',
  'Find',
  'Mark as staff only',
  'Remove all',
  'Remove mark as staff only',
];
const administrativeNoteActionOptions = ['Add note', 'Change note type', 'Find', 'Remove all'];
const setOfColumnValues = [
  {
    noteColumn: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
    noteText: noteTexts.administrativeNote,
  },
  {
    noteColumn:
      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
        .PUBLICATIONS_ABOUT_DESCRIBED_MATERIALS_NOTE,
    noteText: noteTexts.publicationsNote,
  },
  {
    noteColumn: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
    noteText: noteTexts.withNote,
  },
];
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instance.instanceTypeId = instanceTypeData[0].id;
          instance.instanceTypeName = instanceTypeData[0].name;
        });
        InstanceNoteTypes.getInstanceNoteTypesViaApi({
          limit: 1,
          query: `name=="${noteTypes.bibliographyNote}"`,
        })
          .then(({ instanceNoteTypes }) => {
            noteTypeId = instanceNoteTypes[0].id;
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: instance.instanceTypeId,
                title: instance.title,
                notes: [
                  {
                    instanceNoteTypeId: noteTypeId,
                    note: noteTexts.bibliographyNote,
                    staffOnly: true,
                  },
                ],
              },
            }).then((instanceId) => {
              instance.id = instanceId;
            });
          })
          .then(() => {
            cy.getInstanceById(instance.id).then((instanceData) => {
              instance.hrid = instanceData.hrid;
            });
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, instance.id);
          });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C468183 Verify Instance note types (firebird)',
      { tags: ['criticalPath', 'firebird', 'C468183'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.verifyRecordIdentifiers(instanceIdentifiers);
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.RESOURCE_TITLE,
          instance.title,
        );
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyInstanceNoteColumns(instanceNotesColumnNames);
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          ...instanceNotesColumnNames,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
        );
        cy.wait(1000);

        instanceNotesColumnNames.forEach((instanceNoteColumnName) => {
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(instanceNoteColumnName);
        });

        BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
        );
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          instance.id,
          'Notes',
          `${noteTypes.bibliographyNote};${noteTexts.bibliographyNote};true`,
        );

        const uncheckedColumns = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIBLIOGRAPHY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
            .PUBLICATIONS_ABOUT_DESCRIBED_MATERIALS_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
        ];

        BulkEditSearchPane.changeShowColumnCheckbox(...uncheckedColumns);

        uncheckedColumns.forEach((uncheckedColumn) => {
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(uncheckedColumn);
        });

        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.selectOption(noteTypes.bibliographyNote);
        BulkEditSearchPane.verifyInputLabel(noteTypes.bibliographyNote);
        BulkEditActions.verifyTheActionOptions(actionOptions);
        BulkEditActions.selectSecondAction(actionsToSelect.addNote);
        BulkEditActions.verifySecondActionSelected(actionsToSelect.addNote);
        BulkEditActions.fillInSecondTextArea(noteTexts.bibliographyNote2);
        BulkEditActions.verifyValueInSecondTextArea(noteTexts.bibliographyNote2);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        setOfColumnValues.forEach((columnValueSet, ind) => {
          const rowNumber = ind + 1;

          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(rowNumber);
          BulkEditActions.selectOption(columnValueSet.noteColumn, rowNumber);
          BulkEditActions.selectSecondAction(actionsToSelect.addNote, rowNumber);
          BulkEditActions.fillInSecondTextArea(columnValueSet.noteText, rowNumber);
          BulkEditActions.verifyValueInSecondTextArea(columnValueSet.noteText, rowNumber);
          BulkEditActions.verifyConfirmButtonDisabled(false);
        });

        BulkEditActions.verifyTheActionOptions(administrativeNoteActionOptions, 1);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          noteTexts.administrativeNote,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIBLIOGRAPHY_NOTE,
          `${noteTexts.bibliographyNote} (staff only) | ${noteTexts.bibliographyNote2}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
            .PUBLICATIONS_ABOUT_DESCRIBED_MATERIALS_NOTE,
          noteTexts.publicationsNote,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
          noteTexts.withNote,
        );
        BulkEditActions.downloadPreview();

        const notesValueInCsvFile = `${noteTypes.bibliographyNote};${noteTexts.bibliographyNote};true|${noteTypes.bibliographyNote};${noteTexts.bibliographyNote2};false|${noteTypes.publicationsAboutDescribedMaterialsNote};${noteTexts.publicationsNote};false|${noteTypes.withNote};${noteTexts.withNote};false`;

        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          instance.id,
          'Notes',
          notesValueInCsvFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          instance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          noteTexts.administrativeNote,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyPaneRecordsChangedCount('1 instance');
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          noteTexts.administrativeNote,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIBLIOGRAPHY_NOTE,
          `${noteTexts.bibliographyNote} (staff only) | ${noteTexts.bibliographyNote2}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
            .PUBLICATIONS_ABOUT_DESCRIBED_MATERIALS_NOTE,
          noteTexts.publicationsNote,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.WITH_NOTE,
          noteTexts.withNote,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          instance.id,
          'Notes',
          notesValueInCsvFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          instance.id,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          noteTexts.administrativeNote,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByHRID(instance.hrid);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyInstanceTitle(instance.title);
        InstanceRecordView.verifyAdministrativeNote(noteTexts.administrativeNote);
        InstanceRecordView.checkNotesByType(
          0,
          noteTypes.bibliographyNote,
          noteTexts.bibliographyNote,
          'Yes',
        );
        InstanceRecordView.checkNotesByType(
          0,
          noteTypes.bibliographyNote,
          noteTexts.bibliographyNote2,
          'No',
          1,
        );
        InstanceRecordView.checkNotesByType(
          1,
          noteTypes.publicationsAboutDescribedMaterialsNote,
          noteTexts.publicationsNote,
        );
        InstanceRecordView.checkNotesByType(2, noteTypes.withNote, noteTexts.withNote);
      },
    );
  });
});
