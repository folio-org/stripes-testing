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
const note936a = 'downgraded';
const note936b = '2004-J292';
const note936c = '20041103';
const note936d = 'OPR 80/144';
const note936e = 'at conclusion of court case';
const note936f = 'Title IIC project';
const note936h = 'university archives';
const note936i = 'microfilm';
const note936x = 'faces in illustrations are blacked out';
const note936z = 'for further information contact the Preservation Department';
const note5663 = 'v.5';
const marcInstance = {
  title: `AT_C523605_MarcInstance_${getRandomPostfix()}`,
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
    tag: '566',
    content: `$3 ${note5663}`,
    indicators: ['1', '1'],
  },
  {
    tag: '936',
    content: `$a ${note936a} $b ${note936b} $c ${note936c} $d ${note936d} $e ${note936e} $f ${note936f} $h ${note936h} $i ${note936i} $x ${note936x} $z ${note936z}`,
    indicators: ['\\', '\\'],
  },
];

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
      'C523605 Find and remove MARC field (936, 566) not mapped to Inventory Instance (MARC) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C523605'] },
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

        // Step 3-5: Find 936 $i, enter value, select Remove field
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('936', '\\', '\\', 'i');
        BulkEditActions.findAndRemoveFieldActionForMarc(note936i);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 6: Add new row
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Step 7: Find 566 11 $3, enter value, select Remove field
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('566', '1', '1', '3', 1);
        BulkEditActions.findAndRemoveFieldActionForMarc(note5663, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 8: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyCellWithContentAbsentsInAreYouSureForm(
          note936a,
          note936b,
          note936c,
          note936d,
          note936e,
          note936f,
          note936h,
          note936i,
          note936x,
          note936z,
          note5663,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
        );
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 9: Download preview in MARC format
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
              (record) => expect(record.get('936')).to.be.empty,
              (record) => expect(record.get('566')).to.be.empty,

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 10: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          '',
        );

        // Step 11: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyCellWithContentAbsentsInChangesAccordion(
          note936a,
          note936b,
          note936c,
          note936d,
          note936e,
          note936f,
          note936h,
          note936i,
          note936x,
          note936z,
          note5663,
        );
        BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.GENERAL_NOTE,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 12: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 13: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          '',
        );

        // Step 14: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        const arrayOf936FieldSubfields = [
          note936a,
          note936b,
          note936c,
          note936d,
          note936e,
          note936f,
          note936h,
          note936i,
          note936x,
          note936z,
        ];

        arrayOf936FieldSubfields.forEach((note) => {
          InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note);
        });

        InstanceRecordView.verifyNoteTextAbsentInInstanceAccordion(note5663);
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

        // Step 15: Verify changes in MARC source
        InstanceRecordView.viewSource();
        InventoryViewSource.notContains('936\t');
        InventoryViewSource.notContains('566\t');

        arrayOf936FieldSubfields.forEach((note) => {
          InventoryViewSource.notContains(note);
        });

        InventoryViewSource.notContains(note5663);
        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
      },
    );
  });
});
