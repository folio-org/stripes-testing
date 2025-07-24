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
import DateTools from '../../../../support/utils/dateTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

let user;
let marcInstance;
let instanceUUIDsFileName;
let fileNames;
let marcInstanceFields;
const note914a = 'Scale 1:500,000;';
const note914b1 = '1 in. equals 8 miles.';
const note914b2 = 'Perspective map not drawn to scale.';
const note570a = '"Selected bibliography": v. 1, p. 351-358, v. 2, p. 234-236.';
const note5705 = 'NjP';

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
        marcInstance = {
          title: `AT_C523599_MarcInstance_${getRandomPostfix()}`,
        };
        instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
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
            tag: '914',
            content: `$a ${note914a} $b ${note914b1} $b ${note914b2}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: '570',
            content: `$a ${note570a} $5 ${note5705}`,
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

      afterEach('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C523599 Find and remove subfield from MARC field (914, 570) not mapped to Inventory Instance (MARC) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C523599'] },
        () => {
          // Step 1: Show Source, hide General note
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          );
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            true,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          );
          BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
            false,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            'MARC',
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          );

          // Step 2: Open MARC bulk edit form
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

          // Step 3-5: Find 914 and remove subfield $a
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('914', '\\', '\\', 'a');
          BulkEditActions.findAndRemoveSubfieldActionForMarc(note914a);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 6: Add new row
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 7: Find 914 $b (1 in. equals 8 miles.)
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('914', '\\', '\\', 'b', 1);
          BulkEditActions.findAndRemoveSubfieldActionForMarc(note914b1, 1);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 8: Add new row
          BulkEditActions.addNewBulkEditFilterStringForMarcInstance(1);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('570', '\\', '\\', '5', 2);
          BulkEditActions.findAndRemoveSubfieldActionForMarc(note5705, 2);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 9: Confirm changes
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
          BulkEditSearchPane.verifyCellWithContentAbsentsInAreYouSureForm(
            note914a,
            note914b1,
            note914b2,
            note570a,
            note5705,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          );
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 10: Download preview in MARC format
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditActions.downloadPreviewInMarcFormat();

          const currentTimestampUpToMinutes = DateTools.getCurrentISO8601TimestampUpToMinutesUTC();
          const currentTimestampUpToMinutesOneMinuteAfter =
            DateTools.getCurrentISO8601TimestampUpToMinutesUTC(1);
          const currentTimestampUpToMinutesTwoMinuteAfter =
            DateTools.getCurrentISO8601TimestampUpToMinutesUTC(2);
          const assertionsOnMarcFileContent = [
            {
              uuid: marcInstance.uuid,
              assertions: [
                (record) => expect(
                  [
                    currentTimestampUpToMinutes,
                    currentTimestampUpToMinutesOneMinuteAfter,
                    currentTimestampUpToMinutesTwoMinuteAfter,
                  ].some((prefix) => record.get('005')[0].value.startsWith(prefix)),
                ).to.be.true,

                (record) => expect(record.get('914')[0].ind1).to.eq(' '),
                (record) => expect(record.get('914')[0].ind2).to.eq(' '),
                (record) => expect(record.get('914')[0].subf.length).to.eq(1),
                (record) => expect(record.get('914')[0].subf[0][0]).to.eq('b'),
                (record) => expect(record.get('914')[0].subf[0][1]).to.eq(note914b2),

                (record) => expect(record.get('570')[0].ind1).to.eq(' '),
                (record) => expect(record.get('570')[0].ind2).to.eq(' '),
                (record) => expect(record.get('570')[0].subf.length).to.eq(1),
                (record) => expect(record.get('570')[0].subf[0][0]).to.eq('a'),
                (record) => expect(record.get('570')[0].subf[0][1]).to.eq(note570a),

                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            fileNames.previewRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 11: Download preview in CSV format
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            '',
          );

          // Step 12: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
          );
          BulkEditSearchPane.verifyCellWithContentAbsentsInChangesAccordion(
            note914a,
            note914b1,
            note914b2,
            note570a,
            note5705,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

          // Step 13: Download changed records in MARC format
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            fileNames.changedRecordsMarc,
            assertionsOnMarcFileContent,
            1,
          );

          // Step 14: Download changed records in CSV format
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            '',
          );

          // Step 15: Verify changes in Inventory app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note914a);
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note914b1);
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note5705);
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

          // Step 16: Verify changes in MARC source
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('914', `\t914\t   \t$b ${note914b2}`);
          InventoryViewSource.verifyFieldInMARCBibSource('570', `\t570\t   \t$a ${note570a}`);
          InventoryViewSource.verifyFieldContent(
            3,
            DateTools.getFormattedEndDateWithTimUTC(new Date()),
          );
        },
      );
    });
  },
);
