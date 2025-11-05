import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { INSTANCE_NOTE_IDS } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

let user;
let instanceUUIDsFileName;
let matchedRecordsFileName;
let previewFileName;
let errorsFromCommittingFileName;
let changedRecordsFileName;
let folioItem;
let marcInstance;
let marcInstanceFields;
const notes = {
  reproductionNote: 'Instance reproduction note',
  reproductionNoteStaffOnly: 'Instance reproduction note Staff only',
};
const errorReason = ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('In-app approach', () => {
      beforeEach('create test data', () => {
        instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
        matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
        previewFileName = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName);
        errorsFromCommittingFileName =
          BulkEditFiles.getErrorsFromCommittingFileName(instanceUUIDsFileName);
        changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(instanceUUIDsFileName);
        folioItem = {
          instanceName: `AT_C466315_FolioInstance_${getRandomPostfix()}`,
          itemBarcode: `folioItem${getRandomPostfix()}`,
        };
        marcInstance = {
          title: `AT_C466315_MarcInstance_${getRandomPostfix()}`,
        };
        marcInstanceFields = [
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
            content: `$a ${notes.reproductionNote}`,
            indicators: ['\\', '\\'],
          },
        ];

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;
          folioItem.instanceId = InventoryInstances.createInstanceViaApi(
            folioItem.instanceName,
            folioItem.itemBarcode,
          );
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            marcInstance.instanceId = instanceId;

            cy.getInstanceById(folioItem.instanceId).then((body) => {
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
          });
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          cy.wait(15000);
        });
      });

      afterEach('delete test data', () => {
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
        'C466315 Bulk edit Instance fields - change note type within the group (firebird)',
        { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C466315'] },
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
          BulkEditActions.openStartBulkEditFolioInstanceForm();
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [
            folioItem.instanceId,
            marcInstance.instanceId,
          ]);
          BulkEditActions.changeNoteType('Reproduction note', 'General note');
          BulkEditActions.confirmChanges();
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            folioItem.instanceId,
            'General note',
            `${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly} (staff only)`,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.instanceId,
            'General note',
            notes.reproductionNote,
          );
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            'Instance UUID',
            folioItem.instanceId,
            'Notes',
            `General note;${notes.reproductionNote};false|General note;${notes.reproductionNoteStaffOnly};true`,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileName,
            'Instance UUID',
            marcInstance.instanceId,
            'Notes',
            `General note;${notes.reproductionNote};false`,
          );
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyChangesUnderColumns('General note', [
            `${notes.reproductionNote} | ${notes.reproductionNoteStaffOnly} (staff only)`,
          ]);
          BulkEditSearchPane.verifyExactChangesUnderColumns('Reproduction note', '');
          BulkEditSearchPane.verifyErrorLabel(1);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyErrorByIdentifier(marcInstance.instanceId, errorReason);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
            `ERROR,${marcInstance.instanceId},${errorReason}`,
          ]);
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileName,
            'Instance UUID',
            folioItem.instanceId,
            'Notes',
            `General note;${notes.reproductionNote};false|General note;${notes.reproductionNoteStaffOnly};true`,
          );

          TopMenuNavigation.navigateToApp('Inventory');
          InventorySearchAndFilter.searchInstanceByTitle(folioItem.instanceName);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceNotes('General note', notes.reproductionNote);
          InventoryInstance.checkInstanceNotes('General note', notes.reproductionNoteStaffOnly);

          TopMenuNavigation.navigateToApp('Inventory');
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceNotes('Reproduction note', notes.reproductionNote);
        },
      );
    });
  },
);
