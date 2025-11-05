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
const fundingNoteA =
  'Sponsored by the Advanced Research Projects Agency through the Office of Naval Research';
const fundingNoteB = 'N00014-68-A-0245-0007';
const fundingNoteC = 'ARPA Order No. 2616';
const fundingNoteD = '910 3450';
const fundingNoteE = '601101F';
const fundingNoteF = '1D161102B710';
const fundingNoteG = 'RF11121806';
const fundingNoteH = 'WU08';
const fundingNote6 = '245-03/';
const fundingNote8 = '1.3\\a';
const fundingNoteInBulkEditForm = `${fundingNoteA} ${fundingNoteB} ${fundingNoteC} ${fundingNoteD} ${fundingNoteE} ${fundingNoteF} ${fundingNoteG} ${fundingNoteH}`;
const marcInstance = {
  title: `AT_C523600_MarcInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(instanceUUIDsFileName, true);
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
    tag: '536',
    content: `$a ${fundingNoteA} $b ${fundingNoteB} $c ${fundingNoteC} $d ${fundingNoteD} $e ${fundingNoteE} $f ${fundingNoteF} $g ${fundingNoteG} $h ${fundingNoteH} $6 ${fundingNote6} $8 ${fundingNote8}`,
    indicators: ['\\', '\\'],
  },
];

describe('Bulk-edit', () => {
  describe('Instances with source MARC', () => {
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
      'C523600 Find and remove MARC field (536) mapped to Inventory Instance (MARC) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C523600'] },
      () => {
        // Step 1: Show Source and Funding Information Note columns
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
          fundingNoteInBulkEditForm,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          'MARC',
        );

        // Step 2: Hide Funding Information Note column
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
        );

        // Step 3: Open MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 4-6: Find 536 $b, enter value, select Remove field
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('536', '\\', '\\', 'b');
        BulkEditActions.findAndRemoveFieldActionForMarc(fundingNoteB);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 7: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyCellWithContentAbsentsInAreYouSureForm(
          fundingNoteA,
          fundingNoteB,
          fundingNoteC,
          fundingNoteD,
          fundingNoteE,
          fundingNoteF,
          fundingNoteG,
          fundingNoteH,
          fundingNote6,
          fundingNote8,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
          '',
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
              (record) => {
                expect(
                  [currentTimestampUpToMinutes, currentTimestampUpToMinutesOneMinuteAfter].some(
                    (prefix) => record.get('005')[0].value.startsWith(prefix),
                  ),
                ).to.be.true;
              },

              (record) => expect(record.get('536')).to.be.empty,

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];
        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 9: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          '',
        );

        // Step 10: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
          '',
        );
        BulkEditSearchPane.verifyCellWithContentAbsentsInChangesAccordion(
          fundingNoteA,
          fundingNoteB,
          fundingNoteC,
          fundingNoteD,
          fundingNoteE,
          fundingNoteF,
          fundingNoteG,
          fundingNoteH,
          fundingNote6,
          fundingNote8,
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
          '',
        );

        // Step 13: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        const arrayOf536FieldSubfields = [
          fundingNoteA,
          fundingNoteB,
          fundingNoteC,
          fundingNoteD,
          fundingNoteE,
          fundingNoteF,
          fundingNoteG,
          fundingNoteH,
          fundingNote6,
          fundingNote8,
        ];

        arrayOf536FieldSubfields.forEach((note) => {
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note);
        });

        InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.FUNDING_INFORMATION_NOTE,
        );
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

        // Step 14: Verify changes in MARC source
        InstanceRecordView.viewSource();
        InventoryViewSource.notContains('536\t');

        arrayOf536FieldSubfields.forEach((note) => {
          InventoryViewSource.notContains(note);
        });

        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
      },
    );
  });
});
