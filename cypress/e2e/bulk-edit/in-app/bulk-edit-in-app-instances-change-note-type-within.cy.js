import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { INSTANCE_NOTE_IDS } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import inventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

let user;
const notes = {
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
  describe(
    'in-app approach',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach('create test data', () => {
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
          cy.wait(10000);
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(folioItem.itemBarcode);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          marcInstance.itemBarcode,
        );
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
        'C663260 Bulk edit Instance fields - change note type within the group (firebird)',
        { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C663260'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditActions.downloadMatchedResults();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            'Instance UUID',
            'Reproduction note',
            'General note',
          );
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [
            folioItem.instanceId,
            marcInstance.instanceId,
          ]);
          BulkEditActions.openStartBulkEditInstanceForm();
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [
            folioItem.instanceId,
            marcInstance.instanceId,
          ]);
          BulkEditActions.changeNoteType('Reproduction note', 'General note');
          BulkEditActions.confirmChanges();
          [0, 1].forEach((row) => {
            BulkEditActions.verifyChangesInAreYouSureFormByRow(
              'General note',
              [`${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly} (staff only)`],
              row,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByRow('Reproduction note', '', row);
          });

          BulkEditActions.downloadPreview();
          ExportFile.verifyFileIncludes(previewFileName, [
            `,General note;${notes.reproductionNote};false|General note;${notes.reproductionNoteStaffOnly};true\n`,
          ]);
          ExportFile.verifyFileIncludes(previewFileName, ['Reproduction note'], false);
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyChangesUnderColumns('General note', [
            `${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly} (staff only)`,
          ]);
          BulkEditSearchPane.verifyExactChangesUnderColumns('Reproduction note', '');
          BulkEditSearchPane.verifyInputLabel(
            `${instanceUUIDsFileName}: 2 entries * 1 records changed * 1 errors`,
          );
          BulkEditSearchPane.verifyReasonForError(
            'Bulk edit of instance notes is not supported for MARC Instances',
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            'Bulk edit of instance notes is not supported for MARC Instances',
          ]);
          ExportFile.verifyFileIncludes(changedRecordsFileName, [
            `,General note;${notes.reproductionNote};false|General note;${notes.reproductionNoteStaffOnly};true\n`,
          ]);
          TopMenuNavigation.navigateToApp('Inventory');
          InventorySearchAndFilter.searchInstanceByTitle(folioItem.instanceName);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceNotes('General note', notes.reproductionNote);
          InventoryInstance.checkInstanceNotes('General note', notes.reproductionNoteStaffOnly);

          TopMenuNavigation.navigateToApp('Inventory');
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.instanceName);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceNotes('Reproduction note', notes.reproductionNote);
          InventoryInstance.checkInstanceNotes(
            'Reproduction note',
            notes.reproductionNoteStaffOnly,
          );
        },
      );
    },
  );
});
