import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import DateTools from '../../../../support/utils/dateTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  INSTANCE_NOTE_TYPES,
} from '../../../../support/constants';

let user;
let instanceUUIDsFileName;
let fileNames;
let marcInstanceWith562And962Fields;
let marcInstanceWithout562And962Fields;
let marcInstanceWithFieldsData;
let marcInstanceWithoutFieldsData;

// 562 and 962 field data
const existingFieldsData = {
  existing_562_e: '3 copies kept;',
  existing_562_b:
    "Labelled as president's desk copy, board of directors' working file copy, and public release copy",
  existing_962_c: 'Version with air-brushed color illustrations;',
  existing_962_e: 'undefined',
};
const fieldsToAdd = {
  // First 562 field - Add with additional subfield
  field562_1_a: "Annotation in Wilson's hand: Copy one of two sent to John Phipps, 27 March 1897;",
  field562_1_a_additional: 'Copy identified as Declaration of Dissolution, Phipps copy',
  // Second 562 field - Add with subfield 3
  field562_2_a: "With Braun's annotations by hand;",
  field562_2_3: 'Deacidified copy',
  // First 962 field - Add with additional subfield
  field962_1_a_first:
    "Labelled as president's desk copy, board of directors' working file copy, and public release copy",
  field962_1_a_second: '3 copies kept;',
  // Second 962 field - Add with subfield 3
  field962_2_a: 'Marked: "For internal circulation only";',
  field962_2_3: '2 copies.',
};

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Instances with source MARC', () => {
      beforeEach('create test data', () => {
        instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
        marcInstanceWith562And962Fields = {
          title: `AT_C503099_MarcInstanceWithFields_${getRandomPostfix()}`,
        };
        marcInstanceWithout562And962Fields = {
          title: `AT_C503099_MarcInstanceWithoutFields_${getRandomPostfix()}`,
        };
        marcInstanceWithFieldsData = [
          {
            tag: '008',
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: '245',
            content: `$a ${marcInstanceWith562And962Fields.title}`,
            indicators: ['1', '0'],
          },
          {
            tag: '562',
            content: `$e ${existingFieldsData.existing_562_e} $b ${existingFieldsData.existing_562_b}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '962',
            content: `$c ${existingFieldsData.existing_962_c} $e ${existingFieldsData.existing_962_e}`,
            indicators: ['\\', '\\'],
          },
        ];
        marcInstanceWithoutFieldsData = [
          {
            tag: '008',
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: '245',
            content: `$a ${marcInstanceWithout562And962Fields.title}`,
            indicators: ['1', '0'],
          },
        ];

        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Create MARC instance WITH 562 and 962 fields
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceWithFieldsData,
          ).then((instanceId) => {
            marcInstanceWith562And962Fields.uuid = instanceId;

            cy.getInstanceById(marcInstanceWith562And962Fields.uuid).then((instanceData) => {
              marcInstanceWith562And962Fields.hrid = instanceData.hrid;
            });
          });

          // Create MARC instance WITHOUT 562 and 962 fields
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceWithoutFieldsData,
          ).then((instanceId) => {
            marcInstanceWithout562And962Fields.uuid = instanceId;

            cy.getInstanceById(marcInstanceWithout562And962Fields.uuid).then((instanceData) => {
              marcInstanceWithout562And962Fields.hrid = instanceData.hrid;
            });

            // Create CSV file with instance UUIDs
            const instanceUUIDs = [
              marcInstanceWith562And962Fields.uuid,
              marcInstanceWithout562And962Fields.uuid,
            ];
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              instanceUUIDs.join('\n'),
            );
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneRecordsCount('2 instance');
        });
      });

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstanceWith562And962Fields.uuid);
        InventoryInstance.deleteInstanceViaApi(marcInstanceWithout562And962Fields.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C503099 Add MARC field (562, 962) - extended scenarios (MARC) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C503099'] },
        () => {
          // Step 1: Check columns for Source and Copy and Version Identification note
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
          );

          // Verify the instances display proper values
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            marcInstanceWith562And962Fields.hrid,
            [
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
                    .COPY_VERSION_IDENTIFICATION_NOTE,
                value: `${existingFieldsData.existing_562_e} ${existingFieldsData.existing_562_b}`,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
                value: 'MARC',
              },
            ],
          );
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            marcInstanceWithout562And962Fields.hrid,
            [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
                value: 'MARC',
              },
              {
                header:
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES
                    .COPY_VERSION_IDENTIFICATION_NOTE,
                value: '',
              },
            ],
          );

          // Step 2: Open Instances with source MARC bulk edit form
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '2 instance',
          );

          // Step 3: Add first 562 field with subfield a
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('562', '\\', '\\', 'a');
          BulkEditActions.addSubfieldActionForMarc(fieldsToAdd.field562_1_a);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 4: Verify Select action dropdown shows "Additional subfield"
          BulkEditActions.verifyTheSecondActionOptionsEqual(['Additional subfield']);

          // Step 5: Select "Additional subfield" option
          BulkEditActions.selectSecondActionForMarcInstance('Additional subfield');
          BulkEditActions.verifyAdditionalSubfieldRowInitialState();

          // Step 6: Fill in additional subfield a
          BulkEditActions.fillInSubfieldInSubRow('a');
          BulkEditActions.fillInDataInSubRow(fieldsToAdd.field562_1_a_additional);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7-9: Test invalid subfield values
          const invalidInputs = ['>', 'ա', 'B'];

          invalidInputs.forEach((input) => {
            BulkEditActions.fillInSubfieldInSubRow(input);
            BulkEditActions.verifyInvalidValueInSubfieldOfSubRow();
            BulkEditActions.verifyConfirmButtonDisabled(true);
          });

          // Step 10: Enter valid subfield value
          BulkEditActions.fillInSubfieldInSubRow('a');
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 11: Add second 562 field
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('562', '\\', '\\', 'a', 1);
          BulkEditActions.selectActionForMarcInstance('Add', 1);
          BulkEditActions.fillInDataTextAreaForMarcInstance(fieldsToAdd.field562_2_a, 1);
          BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 1);
          BulkEditActions.fillInSubfieldInSubRow('3', 1);
          BulkEditActions.fillInDataInSubRow(fieldsToAdd.field562_2_3, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 12: Add first 962 field
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('962', '\\', '\\', 'a', 2);
          BulkEditActions.selectActionForMarcInstance('Add', 2);
          BulkEditActions.fillInDataTextAreaForMarcInstance(fieldsToAdd.field962_1_a_first, 2);
          BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 2);
          BulkEditActions.fillInSubfieldInSubRow('a', 2);
          BulkEditActions.fillInDataInSubRow(fieldsToAdd.field962_1_a_second, 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 13: Add second 962 field
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(2);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('962', '\\', '\\', 'a', 3);
          BulkEditActions.selectActionForMarcInstance('Add', 3);
          BulkEditActions.fillInDataTextAreaForMarcInstance(fieldsToAdd.field962_2_a, 3);
          BulkEditActions.selectSecondActionForMarcInstance('Additional subfield', 3);
          BulkEditActions.fillInSubfieldInSubRow('3', 3);
          BulkEditActions.fillInDataInSubRow(fieldsToAdd.field962_2_3, 3);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 14: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          // Verify preview shows the expected Copy and Version Identification note column
          const expectedNote = `${fieldsToAdd.field562_1_a} ${fieldsToAdd.field562_1_a_additional} | ${fieldsToAdd.field562_2_a} ${fieldsToAdd.field562_2_3} | ${existingFieldsData.existing_562_e} ${existingFieldsData.existing_562_b}`;
          const expectedNoteInCsvFile = `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE};${fieldsToAdd.field562_1_a} ${fieldsToAdd.field562_1_a_additional};false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE};${fieldsToAdd.field562_2_a} ${fieldsToAdd.field562_2_3};false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE};${existingFieldsData.existing_562_e} ${existingFieldsData.existing_562_b};false`;
          const expectedNoteWithoutExisting = `${fieldsToAdd.field562_1_a} ${fieldsToAdd.field562_1_a_additional} | ${fieldsToAdd.field562_2_a} ${fieldsToAdd.field562_2_3}`;
          const expectedNoteWithoutExistingInCsvFile = `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE};${fieldsToAdd.field562_1_a} ${fieldsToAdd.field562_1_a_additional};false | ${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE};${fieldsToAdd.field562_2_a} ${fieldsToAdd.field562_2_3};false`;

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstanceWith562And962Fields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
            expectedNote,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstanceWithout562And962Fields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
            expectedNoteWithoutExisting,
          );
          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(2);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();

          // Step 15: Download preview in MARC format
          BulkEditActions.downloadPreviewInMarcFormat();

          // Verify MARC file content for both instances
          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstanceWith562And962Fields.uuid,
              assertions: [
                // First 562 field (added by bulk edit)
                (record) => {
                  const firstField562 = record.get('562')[0];
                  expect(firstField562.ind1).to.eq(' ');
                  expect(firstField562.ind2).to.eq(' ');
                  expect(firstField562.subf[0][0]).to.eq('a');
                  expect(firstField562.subf[0][1]).to.eq(fieldsToAdd.field562_1_a);
                  expect(firstField562.subf[1][0]).to.eq('a');
                  expect(firstField562.subf[1][1]).to.eq(fieldsToAdd.field562_1_a_additional);
                },
                // Second 562 field (added by bulk edit)
                (record) => {
                  const secondField562 = record.get('562')[1];
                  expect(secondField562.ind1).to.eq(' ');
                  expect(secondField562.ind2).to.eq(' ');
                  expect(secondField562.subf[0][0]).to.eq('a');
                  expect(secondField562.subf[0][1]).to.eq(fieldsToAdd.field562_2_a);
                  expect(secondField562.subf[1][0]).to.eq('3');
                  expect(secondField562.subf[1][1]).to.eq(fieldsToAdd.field562_2_3);
                },
                // Third 562 field (existing field)
                (record) => {
                  const thirdField562 = record.get('562')[2];
                  expect(thirdField562.ind1).to.eq(' ');
                  expect(thirdField562.ind2).to.eq(' ');
                  expect(thirdField562.subf[0][0]).to.eq('e');
                  expect(thirdField562.subf[0][1]).to.eq(existingFieldsData.existing_562_e);
                  expect(thirdField562.subf[1][0]).to.eq('b');
                  expect(thirdField562.subf[1][1]).to.eq(existingFieldsData.existing_562_b);
                },
                // First 962 field (added by bulk edit)
                (record) => {
                  const firstField962 = record.get('962')[0];
                  expect(firstField962.ind1).to.eq(' ');
                  expect(firstField962.ind2).to.eq(' ');
                  expect(firstField962.subf[0][0]).to.eq('a');
                  expect(firstField962.subf[0][1]).to.eq(fieldsToAdd.field962_1_a_second);
                  expect(firstField962.subf[1][0]).to.eq('a');
                  expect(firstField962.subf[1][1]).to.eq(fieldsToAdd.field962_1_a_first);
                },
                // Second 962 field (added by bulk edit)
                (record) => {
                  const secondField962 = record.get('962')[1];
                  expect(secondField962.ind1).to.eq(' ');
                  expect(secondField962.ind2).to.eq(' ');
                  expect(secondField962.subf[0][0]).to.eq('a');
                  expect(secondField962.subf[0][1]).to.eq(fieldsToAdd.field962_2_a);
                  expect(secondField962.subf[1][0]).to.eq('3');
                  expect(secondField962.subf[1][1]).to.eq(fieldsToAdd.field962_2_3);
                },
                // Third 962 field (existing field)
                (record) => {
                  const thirdField962 = record.get('962')[2];
                  expect(thirdField962.ind1).to.eq(' ');
                  expect(thirdField962.ind2).to.eq(' ');
                  expect(thirdField962.subf[0][0]).to.eq('c');
                  expect(thirdField962.subf[0][1]).to.eq(existingFieldsData.existing_962_c);
                  expect(thirdField962.subf[1][0]).to.eq('e');
                  expect(thirdField962.subf[1][1]).to.eq(existingFieldsData.existing_962_e);
                },
              ],
            },
            {
              uuid: marcInstanceWithout562And962Fields.uuid,
              assertions: [
                // First 562 field (added by bulk edit)
                (record) => {
                  const firstField562 = record.get('562')[0];
                  expect(firstField562.ind1).to.eq(' ');
                  expect(firstField562.ind2).to.eq(' ');
                  expect(firstField562.subf[0][0]).to.eq('a');
                  expect(firstField562.subf[0][1]).to.eq(fieldsToAdd.field562_1_a);
                  expect(firstField562.subf[1][0]).to.eq('a');
                  expect(firstField562.subf[1][1]).to.eq(fieldsToAdd.field562_1_a_additional);
                },
                // Second 562 field (added by bulk edit)
                (record) => {
                  const secondField562 = record.get('562')[1];
                  expect(secondField562.ind1).to.eq(' ');
                  expect(secondField562.ind2).to.eq(' ');
                  expect(secondField562.subf[0][0]).to.eq('a');
                  expect(secondField562.subf[0][1]).to.eq(fieldsToAdd.field562_2_a);
                  expect(secondField562.subf[1][0]).to.eq('3');
                  expect(secondField562.subf[1][1]).to.eq(fieldsToAdd.field562_2_3);
                },
                // First 962 field (added by bulk edit)
                (record) => {
                  const firstField962 = record.get('962')[0];
                  expect(firstField962.ind1).to.eq(' ');
                  expect(firstField962.ind2).to.eq(' ');
                  expect(firstField962.subf[0][0]).to.eq('a');
                  expect(firstField962.subf[0][1]).to.eq(fieldsToAdd.field962_1_a_second);
                  expect(firstField962.subf[1][0]).to.eq('a');
                  expect(firstField962.subf[1][1]).to.eq(fieldsToAdd.field962_1_a_first);
                },
                // Second 962 field (added by bulk edit)
                (record) => {
                  const secondField962 = record.get('962')[1];
                  expect(secondField962.ind1).to.eq(' ');
                  expect(secondField962.ind2).to.eq(' ');
                  expect(secondField962.subf[0][0]).to.eq('a');
                  expect(secondField962.subf[0][1]).to.eq(fieldsToAdd.field962_2_a);
                  expect(secondField962.subf[1][0]).to.eq('3');
                  expect(secondField962.subf[1][1]).to.eq(fieldsToAdd.field962_2_3);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            fileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            2,
          );

          // Step 16: Download preview in CSV format
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.previewRecordsCSV, 2);
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWith562And962Fields.hrid,
            'Notes',
            expectedNoteInCsvFile,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWithout562And962Fields.hrid,
            'Notes',
            expectedNoteWithoutExistingInCsvFile,
          );

          // Step 17: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          // Verify changes are displayed in the Changed Records accordion
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstanceWith562And962Fields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
            expectedNote,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstanceWithout562And962Fields.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.COPY_VERSION_IDENTIFICATION_NOTE,
            expectedNoteWithoutExisting,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(2);

          // Step 18: Download changed records in MARC format
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            2,
          );

          // Step 19: Download changed records in CSV format
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyCSVFileRowsRecordsNumber(fileNames.changedRecordsCSV, 2);
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWith562And962Fields.hrid,
            'Notes',
            expectedNoteInCsvFile,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstanceWithout562And962Fields.hrid,
            'Notes',
            expectedNoteWithoutExistingInCsvFile,
          );

          // Step 20: Navigate to Inventory and verify changes in instance record
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWith562And962Fields.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Verify Copy and Version Identification notes are added
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            INSTANCE_NOTE_TYPES.COPY_AND_VERSION_IDENTIFICATION_NOTE,
            `${fieldsToAdd.field562_1_a} ${fieldsToAdd.field562_1_a_additional}`,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            INSTANCE_NOTE_TYPES.COPY_AND_VERSION_IDENTIFICATION_NOTE,
            `${fieldsToAdd.field562_2_a} ${fieldsToAdd.field562_2_3}`,
            1,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            INSTANCE_NOTE_TYPES.COPY_AND_VERSION_IDENTIFICATION_NOTE,
            `${existingFieldsData.existing_562_e} ${existingFieldsData.existing_562_b}`,
            2,
          );

          // Step 21: View source and verify MARC fields
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource(
            '562',
            `\t562\t   \t$a ${fieldsToAdd.field562_1_a} $a ${fieldsToAdd.field562_1_a_additional}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '562',
            `\t562\t   \t$a ${fieldsToAdd.field562_2_a} $3 ${fieldsToAdd.field562_2_3}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '562',
            `\t562\t   \t$e ${existingFieldsData.existing_562_e} $b ${existingFieldsData.existing_562_b}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '962',
            `\t962\t   \t$a ${fieldsToAdd.field962_1_a_second} $a ${fieldsToAdd.field962_1_a_first}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '962',
            `\t962\t   \t$a ${fieldsToAdd.field962_2_a} $3 ${fieldsToAdd.field962_2_3}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '962',
            `\t962\t   \t$c ${existingFieldsData.existing_962_c} $e ${existingFieldsData.existing_962_e}`,
          );

          // Verify 005 field is updated
          InventoryViewSource.verifyFieldContent(
            3,
            DateTools.getFormattedEndDateWithTimUTC(new Date()),
          );
          InventoryViewSource.close();

          // Step 22: Verify changes in instance without existing fields
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchInstanceByTitle(marcInstanceWithout562And962Fields.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Verify Copy and Version Identification notes are added (only the bulk edit fields)
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            INSTANCE_NOTE_TYPES.COPY_AND_VERSION_IDENTIFICATION_NOTE,
            `${fieldsToAdd.field562_1_a} ${fieldsToAdd.field562_1_a_additional}`,
          );
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            INSTANCE_NOTE_TYPES.COPY_AND_VERSION_IDENTIFICATION_NOTE,
            `${fieldsToAdd.field562_2_a} ${fieldsToAdd.field562_2_3}`,
            1,
          );

          // View source and verify MARC fields (only the bulk edit fields)
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource(
            '562',
            `\t562\t   \t$a ${fieldsToAdd.field562_1_a} $a ${fieldsToAdd.field562_1_a_additional}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '562',
            `\t562\t   \t$a ${fieldsToAdd.field562_2_a} $3 ${fieldsToAdd.field562_2_3}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '962',
            `\t962\t   \t$a ${fieldsToAdd.field962_1_a_second} $a ${fieldsToAdd.field962_1_a_first}`,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            '962',
            `\t962\t   \t$a ${fieldsToAdd.field962_2_a} $3 ${fieldsToAdd.field962_2_3}`,
          );

          // Verify 005 field is updated
          InventoryViewSource.verifyFieldContent(
            3,
            DateTools.getFormattedEndDateWithTimUTC(new Date()),
          );
        },
      );
    });
  },
);
