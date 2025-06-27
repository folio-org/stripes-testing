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
const accumulationNoteA = '5.4 cu. ft. average monthly accumulation,';
const accumulationNoteB = 'Total reference requests for 1984: 179.';
const accumulationNote3 = 'Employee records';
const accumulationNote5 = 'DLC';
const accumulationNote6 = '100-01/Cyrl';
const accumulationNote8 = '1.5\\a';
const fullAccumulationNote = `${accumulationNoteA} ${accumulationNoteB} ${accumulationNote3} ${accumulationNote5} ${accumulationNote6} ${accumulationNote8}`;
const marcInstance = {
  title: `AT_C506685_MarcInstance_${getRandomPostfix()}`,
};
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
    tag: '584',
    content: `$a ${accumulationNoteA} $b ${accumulationNoteB} $3 ${accumulationNote3} $5 ${accumulationNote5} $6 ${accumulationNote6} $8 ${accumulationNote8}`,
    indicators: ['\\', '\\'],
  },
];
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.uuid = instanceId;
            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
              FileManager.createFile(
                `cypress/fixtures/${instanceUUIDsFileName}`,
                marcInstance.uuid,
              );
            });
          },
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
      'C506685 Remove MARC field (584) mapped to Inventory Instance (MARC) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C506685'] },
      () => {
        // Step 1: Check columns for Source and Accumulation and Frequency of Use note
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_OF_USE_NOTE,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_OF_USE_NOTE,
          fullAccumulationNote,
        );

        // Step 2: Uncheck Accumulation and Frequency of Use note column
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_OF_USE_NOTE,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_OF_USE_NOTE,
        );

        // Step 3: Open MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 4-6: Fill in field 584 with subfield b and Remove all action
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('584', '\\', '\\', 'b');
        BulkEditActions.selectActionForMarcInstance('Remove all');
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_OF_USE_NOTE,
          `${accumulationNoteA} ${accumulationNote3} ${accumulationNote5} ${accumulationNote6} ${accumulationNote8}`,
        );
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 8: Download preview in MARC format
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
              (record) => expect(record.get('005')[0].value).to.match(/^[0-9]{14}\.[0-9]{1}$/),
              (record) => {
                expect(
                  record.get('005')[0].value.startsWith(currentTimestampUpToMinutes) ||
                    record
                      .get('005')[0]
                      .value.startsWith(currentTimestampUpToMinutesOneMinuteAfter),
                ).to.be.true;
              },
              (record) => expect(record.get('008')).to.not.be.empty,

              (record) => expect(record.get('584')[0].ind1).to.eq(' '),
              (record) => expect(record.get('584')[0].ind2).to.eq(' '),
              (record) => expect(record.get('584')[0].subf[0][0]).to.eq('a'),
              (record) => expect(record.get('584')[0].subf[0][1]).to.eq(accumulationNoteA),
              (record) => expect(record.get('584')[0].subf[1][0]).to.eq('3'),
              (record) => expect(record.get('584')[0].subf[1][1]).to.eq(accumulationNote3),
              (record) => expect(record.get('584')[0].subf[2][0]).to.eq('5'),
              (record) => expect(record.get('584')[0].subf[2][1]).to.eq(accumulationNote5),
              (record) => expect(record.get('584')[0].subf[3][0]).to.eq('6'),
              (record) => expect(record.get('584')[0].subf[3][1]).to.eq(accumulationNote6),
              (record) => expect(record.get('584')[0].subf[4][0]).to.eq('8'),
              (record) => expect(record.get('584')[0].subf[4][1]).to.eq(accumulationNote8),

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewMarc, assertionsOnMarcFileContent, 1);

        // Step 9: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_OF_USE_NOTE};${accumulationNoteA} ${accumulationNote3} ${accumulationNote5} ${accumulationNote6} ${accumulationNote8};false`,
        );

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_OF_USE_NOTE,
          `${accumulationNoteA} ${accumulationNote3} ${accumulationNote5} ${accumulationNote6} ${accumulationNote8}`,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 11: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 12: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_OF_USE_NOTE};${accumulationNoteA} ${accumulationNote3} ${accumulationNote5} ${accumulationNote6} ${accumulationNote8};false`,
        );

        // Step 13: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'No',
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACCUMULATION_FREQUENCY_OF_USE_NOTE,
          `${accumulationNoteA} ${accumulationNote3} ${accumulationNote5} ${accumulationNote6} ${accumulationNote8}`,
        );
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

        // Step 14: Verify changes in MARC source
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '584',
          `\t584\t   \t$a ${accumulationNoteA} $3 ${accumulationNote3} $5 ${accumulationNote5} $6 ${accumulationNote6} $8 ${accumulationNote8}`,
        );
        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
      },
    );
  });
});
