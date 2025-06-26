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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import DateTools from '../../../../support/utils/dateTools';

let user;
let marcInstance;
let marcInstanceFields;
let instanceUUIDsFileName;
let fileNames;
const existingDissertationNote = 'Mémoire de stage (3e cycle)';
const appendedSubfieldC = 'Université de Nantes';
const appendedSubfieldD = '1981';
const expectedFinalNote = `${existingDissertationNote} ${appendedSubfieldC} ${appendedSubfieldD}`;

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
        marcInstance = {
          title: `AT_C506676_MarcInstance_${getRandomPostfix()}`,
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
            tag: '502',
            content: '$a Mémoire de stage (3e cycle)',
            indicators: ['\\', '\\'],
          },
        ];

        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;

              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                marcInstance.uuid,
              );
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
          BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
          BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(instanceUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('1 instance');
          BulkEditSearchPane.verifyFileNameHeadLine(instanceUUIDsFileName);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C506676 Append subfield to MARC field (502) mapped to Inventory Instance (MARC) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C506676'] },
        () => {
          // Step 1: Check columns for Source and Dissertation note
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            existingDissertationNote,
          );

          // Step 2: Uncheck Dissertation note column
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
          );

          // Step 3: Open MARC bulk edit form
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

          // Step 4-6: Fill in field 502 with subfield a and Find action
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('502', '\\', '\\', 'a');
          BulkEditActions.findAndAppendActionForMarc(
            existingDissertationNote,
            'c',
            appendedSubfieldC,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 7-12: Test validation for invalid subfield values
          const invalidInputs = ['>', 'ա', 'B'];

          invalidInputs.forEach((input) => {
            BulkEditActions.fillInSecondSubfield(input);
            BulkEditActions.verifyInvalidValueInSecondSubfield();
            BulkEditActions.verifyConfirmButtonDisabled(true);
          });

          BulkEditActions.fillInSecondSubfield('c', 0);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 13: Add new row
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();

          // Step 14: Fill in second row with subfield d
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('502', '\\', '\\', 'a', 1);
          BulkEditActions.findAndAppendActionForMarc(
            existingDissertationNote,
            'd',
            appendedSubfieldD,
            1,
          );
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 15: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

          // Verify changes in Are You Sure form
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            expectedFinalNote,
          );

          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 16: Download preview in MARC format
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditActions.downloadPreviewInMarcFormat();

          const currentTimestampUpToMinutes = DateTools.getCurrentISO8601TimestampUpToMinutesUTC();
          const currentTimestampUpToMinutesOneMinuteAfter =
            DateTools.getCurrentISO8601TimestampUpToMinutesUTC(1);
          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstance.uuid,
              assertions: [
                (record) => expect(record.leader).to.exist,
                (record) => expect(record.get('001')).to.not.be.empty,
                (record) => expect(record.get('005')).to.not.be.empty,
                (record) => expect(record.get('005')[0].value).to.match(/^\d{14}\.\d{1}$/),
                (record) => {
                  expect(
                    record.get('005')[0].value.startsWith(currentTimestampUpToMinutes) ||
                      record
                        .get('005')[0]
                        .value.startsWith(currentTimestampUpToMinutesOneMinuteAfter),
                  ).to.be.true;
                },
                (record) => expect(record.get('008')).to.not.be.empty,

                (record) => expect(record.get('502')[0].ind1).to.eq(' '),
                (record) => expect(record.get('502')[0].ind2).to.eq(' '),
                (record) => expect(record.get('502')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('502')[0].subf[0][1]).to.eq(existingDissertationNote),
                (record) => expect(record.get('502')[0].subf[1][0]).to.eq('c'),
                (record) => expect(record.get('502')[0].subf[1][1]).to.eq(appendedSubfieldC),
                (record) => expect(record.get('502')[0].subf[2][0]).to.eq('d'),
                (record) => expect(record.get('502')[0].subf[2][1]).to.eq(appendedSubfieldD),

                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(fileNames.previewMarc, assertionsOnMarcFileContent, 1);

          // Step 17: Download preview in CSV format
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE};${expectedFinalNote};false`,
          );

          // Step 18: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);

          // Verify changes in changed records accordion
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            expectedFinalNote,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

          // Step 19: Download changed records in MARC format
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();
          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 20: Download changed records in CSV format
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE};${expectedFinalNote};false`,
          );

          // Step 21: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.DISSERTATION_NOTE,
            expectedFinalNote,
          );
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

          // Step 22: Verify changes in MARC source
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource(
            '502',
            `\t502\t   \t$a ${existingDissertationNote} $c ${appendedSubfieldC} $d ${appendedSubfieldD}`,
          );
          InventoryViewSource.verifyFieldContent(
            3,
            DateTools.getFormattedEndDateWithTimUTC(new Date()),
          );
        },
      );
    });
  },
);
