import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  INSTANCE_NOTE_TYPES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceNoteTypes from '../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

let user;
let instanceTypeId;
let reproductionNoteTypeId;
const folioInstance = {
  title: `AT_C503094_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C503094_MarcInstance_${getRandomPostfix()}`,
};
const notes = {
  folioAdminNote: 'admin note',
  folioReproductionNote: 'test instance note',
  marcAdminNote: 'admin note',
  marcReproductionNote: 'Reproduction note',
};
const invalidUUIDs = new Array(3).fill(null).map(() => `invalid-uuid-format-${getRandomPostfix()}`);
const marcInstanceFields = [
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
    content: `$a ${notes.marcReproductionNote}`,
    indicators: ['\\', '\\'],
  },
];
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InstanceNoteTypes.getInstanceNoteTypesViaApi({
          limit: 1,
          query: `name=="${INSTANCE_NOTE_TYPES.REPRODUCTION_NOTE}"`,
        })
          .then(({ instanceNoteTypes }) => {
            reproductionNoteTypeId = instanceNoteTypes[0].id;
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstance.title,
                administrativeNotes: [notes.folioAdminNote],
                notes: [
                  {
                    instanceNoteTypeId: reproductionNoteTypeId,
                    note: notes.folioReproductionNote,
                    staffOnly: false,
                  },
                ],
              },
            }).then((createdInstanceData) => {
              folioInstance.uuid = createdInstanceData.instanceId;

              cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                folioInstance.hrid = instanceData.hrid;
              });
            });
          })
          .then(() => {
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((instanceId) => {
              marcInstance.uuid = instanceId;

              cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                marcInstance.hrid = instanceData.hrid;
                instanceData.administrativeNotes = [notes.marcAdminNote];
                cy.updateInstance(instanceData);

                // Create CSV file with valid and invalid UUIDs
                const csvContent = [folioInstance.uuid, marcInstance.uuid, ...invalidUUIDs].join(
                  '\n',
                );
                FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, csvContent);
              });
            });
          });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C503094 Verify number of errors counted on the Confirmation screen is the same as in .csv file (firebird)',
      { tags: ['criticalPath', 'firebird', 'C503094'] },
      () => {
        // Step 1: Select the "Inventory - instances" radio button and "Instance UUIDs" option
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');

        // Step 2: Upload a .csv file with valid and invalid Instances UUIDs
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the .csv file with Instances UUIDs
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPopulatedPreviewPage();
        BulkEditSearchPane.verifyErrorLabel(invalidUUIDs.length);

        invalidUUIDs.forEach((uuid) => {
          BulkEditSearchPane.verifyNonMatchedResults(uuid);
        });

        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(invalidUUIDs.length);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);

        // Step 4: Click "Actions" menu and check columns
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.REPRODUCTION_NOTE,
        );

        // Step 5: Download matched records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        ExportFile.verifyFileIncludes(fileNames.matchedRecordsCSV, [
          folioInstance.uuid,
          marcInstance.uuid,
        ]);

        // Step 6: Click "Actions" menu and select "FOLIO Instances"
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditForm();

        // Step 7: Select "Reproduction note" and "Change note type" to "Administrative note"
        BulkEditActions.changeNoteType(
          INSTANCE_NOTE_TYPES.REPRODUCTION_NOTE,
          INSTANCE_NOTE_TYPES.ADMINISTRATIVE_NOTE,
        );
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(2);

        // Step 9: Click "x" icon on the "Are you sure?" form
        BulkEditActions.closeAreYouSureForm();

        // Step 10: Click "x" icon on the "Bulk edit in app" form
        BulkEditActions.closeBulkEditInAppForm();
        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPopulatedPreviewPage();
        BulkEditSearchPane.verifyErrorLabel(invalidUUIDs.length);

        invalidUUIDs.forEach((uuid) => {
          BulkEditSearchPane.verifyNonMatchedResults(uuid);
        });

        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(invalidUUIDs.length);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);

        // Step 11: Reload page (F5)
        cy.reload();
        BulkEditSearchPane.waitLoading();

        BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
        BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        BulkEditSearchPane.verifyPopulatedPreviewPage();
        BulkEditSearchPane.verifyErrorLabel(invalidUUIDs.length);

        invalidUUIDs.forEach((uuid) => {
          BulkEditSearchPane.verifyNonMatchedResults(uuid);
        });

        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(invalidUUIDs.length);
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);

        // Step 12: Click "Actions" menu and select "FOLIO Instances"
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditForm();

        // Step 13: Select "Administrative note" and "Change note type" to "With note"
        BulkEditActions.changeNoteType(
          INSTANCE_NOTE_TYPES.ADMINISTRATIVE_NOTE,
          INSTANCE_NOTE_TYPES.WITH_NOTE,
        );
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 14: Click on the "Plus" icon to add new row
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 15: Select "Reproduction note" and "Change note type" to "Administrative note"
        BulkEditActions.changeNoteType(
          INSTANCE_NOTE_TYPES.REPRODUCTION_NOTE,
          INSTANCE_NOTE_TYPES.ADMINISTRATIVE_NOTE,
          1,
        );
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 16: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(2);

        // Step 17: Click "Keep editing" on the "Are you sure?" form
        BulkEditActions.clickKeepEditingBtn();

        // Step 18: Replace note type in first row (e.g., "With note" to "Bibliography note")
        BulkEditActions.selectNoteTypeWhenChangingIt(INSTANCE_NOTE_TYPES.BIBLIOGRAPHY_NOTE);

        // Step 19: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(2);

        // Step 20: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          folioInstance.uuid,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: notes.folioReproductionNote,
            },
            {
              header: 'Notes',
              value: `Bibliography note;${notes.folioAdminNote};false`,
            },
          ],
        );

        // Step 21: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyErrorLabel(2);
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(2);

        // Step 22: Download changed records (CSV)
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          folioInstance.uuid,
          [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
              value: notes.folioReproductionNote,
            },
            {
              header: 'Notes',
              value: `Bibliography note;${notes.folioAdminNote};false`,
            },
          ],
        );
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.changedRecordsCSV, 1);

        // Step 23: Download errors (CSV)
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
          `ERROR,${marcInstance.uuid},${ERROR_MESSAGES.ADMINISTRATIVE_NOTES_NOT_SUPPORTED_FOR_MARC}`,
          `ERROR,${marcInstance.uuid},${ERROR_MESSAGES.EDIT_MARC_INSTANCE_NOTES_NOT_SUPPORTED}`,
        ]);
        BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.errorsFromCommitting, 2);

        // Step 24: Navigate to "Inventory" app and verify FOLIO Instance changes
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyAdministrativeNote(notes.folioReproductionNote);
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'No',
          INSTANCE_NOTE_TYPES.BIBLIOGRAPHY_NOTE,
          notes.folioAdminNote,
        );

        // Step 25: Navigate to "Inventory" app and verify MARC Instance was NOT changed
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyAdministrativeNote(notes.marcAdminNote);
        InventoryInstance.checkInstanceNotes(
          INSTANCE_NOTE_TYPES.REPRODUCTION_NOTE,
          notes.marcReproductionNote,
        );
      },
    );
  });
});
