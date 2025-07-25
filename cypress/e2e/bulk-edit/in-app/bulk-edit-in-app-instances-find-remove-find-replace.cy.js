import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import { INSTANCE_NOTE_IDS } from '../../../support/constants';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*-Matched-Records-${instanceUUIDsFileName}`;
const previewFileName = `*-Updates-Preview-${instanceUUIDsFileName}`;
const folioItem = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const marcInstance = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: `folioItem${getRandomPostfix()}`,
};
const newReproductionNote = 'NEW reproduction note  ~,!,@,#,$,%,^,&,(,),~,{.[,]<},>,ø, Æ, §,';

const notes = {
  dissertationNote: 'Test instance note',
  dissertationNoteStaffOnly: 'test instance note',
  reproductionNote: 'reproduction note',
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
        [marcInstance.instanceId, folioItem.instanceId].forEach((instanceId) => {
          cy.getInstanceById(instanceId).then((body) => {
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
              {
                instanceNoteTypeId: INSTANCE_NOTE_IDS.REPRODUCTION_NOTE,
                note: notes.reproductionNote,
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
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioItem.itemBarcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(marcInstance.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName, previewFileName);
    });

    it(
      'C605957 Verify Bulk Edit actions for Instance notes - find-replace and find-remove (firebird)',
      { tags: ['criticalPath', 'firebird', 'C605957'] },
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
        BulkEditActions.openStartBulkEditInstanceForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.noteRemove('Dissertation note', notes.dissertationNote);
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
        BulkEditSearchPane.isConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditSearchPane.verifyInputLabel(
          '2 records will be changed if the Commit changes button is clicked. You may choose Download preview to review all changes prior to saving.',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Suppress from discovery',
          'true',
          0,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Suppress from discovery',
          'true',
          1,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow('Staff suppress', 'true', 0);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow('Staff suppress', 'true', 1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Dissertation note',
          notes.dissertationNoteStaffOnly,
          0,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Dissertation note',
          notes.dissertationNoteStaffOnly,
          1,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Reproduction note',
          newReproductionNote,
          0,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByRow(
          'Reproduction note',
          newReproductionNote,
          1,
        );
        BulkEditActions.downloadPreview();
        ExportFile.verifyFileIncludes(previewFileName, [
          `${marcInstance.instanceId},true,true,`,
          `${folioItem.instanceId},true,true,`,
          `,"Dissertation note;${notes.dissertationNoteStaffOnly};false|Reproduction note;${newReproductionNote};false"\n`,
        ]);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyReasonForError(marcInstance.instanceId);
      },
    );
  });
});
