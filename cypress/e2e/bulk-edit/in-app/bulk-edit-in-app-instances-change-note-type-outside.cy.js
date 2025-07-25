import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { APPLICATION_NAMES, INSTANCE_NOTE_IDS } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import inventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const notes = {
  adminNote: 'adminNote',
  reproductionNote: 'Instance reproduction note',
  reproductionNoteStaffOnly: 'Instance reproduction note Staff only',
};

const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${instanceUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${instanceUUIDsFileName}`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${instanceUUIDsFileName}`;
const changedRecordsFileName = `*-Changed-Records-${instanceUUIDsFileName}`;
const folioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};

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
        });
        inventoryHoldings.getHoldingsMarcSource().then((marcSource) => {
          cy.getInstanceById(marcInstance.instanceId).then((body) => {
            body.source = marcSource.name;
            body.sourceId = marcSource.id;
            cy.updateInstance(body);
          });
        });
        FileManager.createFile(
          `cypress/fixtures/${instanceUUIDsFileName}`,
          `${marcInstance.instanceId}\n${folioItem.instanceId}`,
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(marcInstance.itemBarcode);
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
      'C663294 Verify Bulk Edit actions for Instance notes - change note type to other group (firebird)',
      { tags: ['criticalPath', 'firebird', 'C663294'] },
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
        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.changeNoteType('Administrative note', 'With note');
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.changeNoteType('Reproduction note', 'Administrative note', 1);
        BulkEditActions.confirmChanges();
        [0, 1].forEach((row) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow('With note', notes.adminNote, row);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow('Reproduction note', '', row);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
            'Administrative note',
            `${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly}`,
            row,
          );
        });

        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          [
            `${marcInstance.hrid},MARC,,,,${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly}`,
          ],
        ]);
        ExportFile.verifyFileIncludes(previewFileName, [
          [
            `${folioItem.hrid},FOLIO,,,,${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly}`,
          ],
        ]);
        ExportFile.verifyFileIncludes(previewFileName, ['With note;adminNote;false']);
        ExportFile.verifyFileIncludes(previewFileName, ['Reproduction note'], false);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyExactChangesUnderColumns('With note', notes.adminNote);
        BulkEditSearchPane.verifyExactChangesUnderColumns('Reproduction note', '');
        BulkEditSearchPane.verifyExactChangesUnderColumns(
          'Administrative note',
          `${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly}`,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(changedRecordsFileName, [
          [
            `${folioItem.hrid},FOLIO,,,,${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly}`,
          ],
        ]);
        ExportFile.verifyFileIncludes(changedRecordsFileName, ['With note;adminNote;false']);
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
        InventoryInstance.checkInstanceNotes('Reproduction note', notes.reproductionNoteStaffOnly);
      },
    );
  });
});
