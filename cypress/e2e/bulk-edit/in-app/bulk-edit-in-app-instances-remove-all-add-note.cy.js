import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import { APPLICATION_NAMES, INSTANCE_NOTE_IDS } from '../../../support/constants';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${instanceUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${instanceUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${instanceUUIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${instanceUUIDsFileName}`;
const folioItem = {
  instanceName: `C468192 folio instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  instanceName: `C468192 marc instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const notes = {
  dissertationNote: 'test instance note',
  dissertationNoteStaffOnly: 'test instance note staff only',
  dataQualityNote: 'data quality note',
  exhibitionsNote: 'exhibitions note',
  administrativeNote: 'administrative note',
};
const reasonForError = 'Bulk edit of instance notes is not supported for MARC Instances.';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
        marcInstance.instanceId = InventoryInstances.createInstanceViaApi(
          marcInstance.instanceName,
          marcInstance.itemBarcode,
        );
        [marcInstance, folioItem].forEach((instance) => {
          cy.getInstanceById(instance.instanceId).then((body) => {
            instance.hrid = body.hrid;
            body.notes = [
              {
                instanceNoteTypeId: INSTANCE_NOTE_IDS.DISSERTATION_NOTE,
                note: notes.dissertationNote,
                staffOnly: false,
              },
              {
                instanceNoteTypeId: INSTANCE_NOTE_IDS.DISSERTATION_NOTE,
                note: notes.dissertationNoteStaffOnly,
                staffOnly: false,
              },
            ];
            cy.updateInstance(body);
          });
        });
        InventoryHoldings.getHoldingsMarcSource().then((marcSource) => {
          cy.getInstanceById(marcInstance.instanceId).then((body) => {
            body.source = marcSource.name;
            body.sourceId = marcSource.id;
            cy.updateInstance(body);
          });
        });
        FileManager.createFile(
          `cypress/fixtures/${instanceUUIDsFileName}`,
          `${folioItem.instanceId}\n${marcInstance.instanceId}`,
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(marcInstance.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
        errorsFromCommittingFileName,
      );
    });

    it(
      'C663293 Verify Bulk Edit actions for Instance notes - remove all and add note (firebird)',
      { tags: ['criticalPath', 'firebird', 'C663293'] },
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
        BulkEditActions.openStartBulkEditInstanceForm();
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
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          [`${marcInstance.hrid},MARC,,,,${notes.administrativeNote}`],
        ]);
        ExportFile.verifyFileIncludes(previewFileName, [
          [`${folioItem.hrid},FOLIO,,,,${notes.administrativeNote}`],
        ]);
        ExportFile.verifyFileIncludes(previewFileName, [
          [
            `Data quality note;${notes.dataQualityNote};false|Exhibitions note;${notes.exhibitionsNote};true`,
          ],
        ]);
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
          `${notes.dissertationNote} | ${notes.dissertationNoteStaffOnly}`,
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

        BulkEditSearchPane.verifyErrorLabelInErrorAccordion(instanceUUIDsFileName, 2, 2, 3);
        BulkEditSearchPane.verifyNonMatchedResults(marcInstance.instanceId);
        BulkEditSearchPane.verifyReasonForError(reasonForError);

        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        ExportFile.verifyFileIncludes(previewFileName, [
          [`${folioItem.hrid},FOLIO,,,,${notes.administrativeNote}`],
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
