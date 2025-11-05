/* eslint-disable no-unused-expressions */
import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';

let user;
const marcInstanceWithAdminNote = {
  title: `C656340_MarcInstanceWithAdminNote_${getRandomPostfix()}`,
  noteText: 'admin note',
  replacedNoteText: 'Admin note',
  replacedNoteTextInInventory: 'Admin note',
};
const marcInstanceWithAdministrativeNote = {
  title: `C656340_MarcInstanceWithAdministrativeNote_${getRandomPostfix()}`,
  noteText: 'administrative note',
  replacedNoteText: 'Administrative note',
  replacedNoteTextInInventory: 'Administrative note',
};
const marcInstanceWithoutAdminNote = {
  title: `C656340_MarcInstanceWithoutAdminNote_${getRandomPostfix()}`,
  noteText: '',
  replacedNoteText: '',
  replacedNoteTextInInventory: 'No value set-',
};
const marcInstances = [
  marcInstanceWithAdminNote,
  marcInstanceWithoutAdminNote,
  marcInstanceWithAdministrativeNote,
];
const warningMessage = 'No change in administrative data required';
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          marcInstances.forEach((instance) => {
            cy.createSimpleMarcBibViaAPI(instance.title).then((instanceId) => {
              instance.uuid = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                instance.hrid = instanceData.hrid;

                instanceData.administrativeNotes = [instance.noteText];

                cy.updateInstance(instanceData);
              });
            });
          });
        })
        .then(() => {
          FileManager.createFile(
            `cypress/fixtures/${instanceUUIDsFileName}`,
            marcInstances.map((i) => i.uuid).join('\n'),
          );

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('3 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstanceWithAdminNote.uuid);
      InventoryInstance.deleteInstanceViaApi(marcInstanceWithoutAdminNote.uuid);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C656340 Bulk edit administrative data for part of the records (MARC) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C656340'] },
      () => {
        // Step 1: Hide Administrative note column
        BulkEditActions.openActions();
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
        );

        // Step 2: Download matched records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.matchedRecordsCSV, 3);

        marcInstances.forEach((instance) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            instance.noteText,
          );
        });

        // Step 3-4: Open bulk edit form for MARC instances
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
        BulkEditActions.noteReplaceWith(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          'admin',
          'Admin',
        );
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 5: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(3);

        marcInstances.forEach((instance) => {
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            instance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            instance.replacedNoteText,
          );
        });
        BulkEditActions.verifyAreYouSureForm(3);
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(3);

        // Step 6: Download preview in CSV format
        BulkEditActions.downloadPreview();

        marcInstances.forEach((instance) => {
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            instance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            instance.replacedNoteText,
          );
        });

        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.previewRecordsCSV, 3);

        // Step 7: Download preview in MARC format
        BulkEditActions.downloadPreviewInMarcFormat();

        const assertionsOnMarcFileContent = marcInstances.map((instance) => ({
          uuid: instance.uuid,
          assertions: [
            (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
            (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instance.uuid),
          ],
        }));

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 3);

        // Step 8: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(2);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstanceWithAdminNote.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          marcInstanceWithAdminNote.replacedNoteText,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstanceWithAdministrativeNote.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          marcInstanceWithAdministrativeNote.replacedNoteText,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(2);

        BulkEditSearchPane.verifyErrorLabel(0, 1);
        BulkEditSearchPane.verifyErrorByIdentifier(
          marcInstanceWithoutAdminNote.uuid,
          warningMessage,
          'Warning',
        );

        // Step 9: Download changed records
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithAdminNote.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          marcInstanceWithAdminNote.replacedNoteText,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstanceWithAdministrativeNote.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          marcInstanceWithAdministrativeNote.replacedNoteText,
        );
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.changedRecordsCSV, 2);

        // Step 10: Download changed records in MARC format
        BulkEditActions.downloadChangedMarc();

        const assertionsOnMarcFileContentInChangedFile = [
          marcInstanceWithAdminNote,
          marcInstanceWithAdministrativeNote,
        ].map((instance) => ({
          uuid: instance.uuid,
          assertions: [
            (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
            (record) => expect(record.get('999')[0].subf[0][1]).to.eq(instance.uuid),
          ],
        }));

        parseMrcFileContentAndVerify(
          fileNames.changedRecordsMarc,
          assertionsOnMarcFileContentInChangedFile,
          2,
        );

        // Step 11: Inventory app - verify changes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        marcInstances.forEach((instance) => {
          InventorySearchAndFilter.searchInstanceByTitle(instance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyAdministrativeNote(instance.replacedNoteTextInInventory);
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyAbsenceOfValue(instance.replacedNoteTextInInventory);
          InventoryViewSource.close();
          InventorySearchAndFilter.resetAll();
        });
      },
    );
  });
});
