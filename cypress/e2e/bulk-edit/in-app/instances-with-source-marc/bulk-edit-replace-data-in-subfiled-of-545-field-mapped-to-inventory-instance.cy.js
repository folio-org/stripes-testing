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
const biographicalNoteA =
  'The Baton Rouge Audubon Society is a chapter of the National Audubon Society, a bird preservation group founded in 1905 and named for the American naturalist and wildlife painter John James Audubon (1785-1851).';
const biographicalNoteU1 = 'http://www.braudubon.org/';
const biographicalNoteU2 = 'http://www.braudubon.com/';
const newBiographicalNoteA =
  biographicalNoteA +
  ' The Baton Rouge Audubon Society is dedicated to protecting birds, wildlife, and their habitats in Louisiana. More information about the Baton Rouge Audubon Society is available on its websites at:';
const newBiographicalNoteU2 = 'http://www.braudubon.net/';
const marcInstance = {
  title: `AT_C506681_MarcInstance_${getRandomPostfix()}`,
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
    tag: '545',
    content: `$a ${biographicalNoteA} $u ${biographicalNoteU1} $u ${biographicalNoteU2}`,
    indicators: ['0', '\\'],
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
      'C506681 Replace data in the subfield of MARC field (545) mapped to Inventory Instance (MARC) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C506681'] },
      () => {
        // Step 1: Show Source and Biographical or Historical Data columns
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
          `${biographicalNoteA} ${biographicalNoteU1} ${biographicalNoteU2}`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          'MARC',
        );

        // Step 2: Hide Biographical or Historical Data column
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
        );

        // Step 3: Open MARC bulk edit form
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();

        // Step 4-8: Find 545 $a
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('545', '0', '\\', 'a');
        BulkEditActions.findAndReplaceWithActionForMarc(biographicalNoteA, newBiographicalNoteA);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 9-10: Add new row for 545 $u
        BulkEditActions.addNewBulkEditFilterStringForMarcInstance();
        BulkEditActions.verifyConfirmButtonDisabled(true);
        BulkEditActions.fillInTagAndIndicatorsAndSubfield('545', '0', '\\', 'u', 1);
        BulkEditActions.findAndReplaceWithActionForMarc(
          biographicalNoteU2,
          newBiographicalNoteU2,
          1,
        );
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 11: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
          `${newBiographicalNoteA} ${biographicalNoteU1} ${newBiographicalNoteU2}`,
        );
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 12: Download preview in MARC format
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
                  record.get('005')[0].value.startsWith(currentTimestampUpToMinutes) ||
                    record
                      .get('005')[0]
                      .value.startsWith(currentTimestampUpToMinutesOneMinuteAfter),
                ).to.be.true;
              },
              (record) => {
                expect(record.fields[4]).to.deep.eq([
                  '545',
                  '0 ',
                  'a',
                  newBiographicalNoteA,
                  'u',
                  biographicalNoteU1,
                  'u',
                  newBiographicalNoteU2,
                ]);
              },
              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(fileNames.previewMarc, assertionsOnMarcFileContent, 1);

        // Step 13: Download preview in CSV format
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA};${newBiographicalNoteA} ${biographicalNoteU1} ${newBiographicalNoteU2};false`,
        );

        // Step 14: Commit changes
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
          `${newBiographicalNoteA} ${biographicalNoteU1} ${newBiographicalNoteU2}`,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);

        // Step 15: Download changed records in MARC format
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(fileNames.changedRecordsMarc, assertionsOnMarcFileContent, 1);

        // Step 16: Download changed records in CSV format
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          marcInstance.hrid,
          'Notes',
          `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA};${newBiographicalNoteA} ${biographicalNoteU1} ${newBiographicalNoteU2};false`,
        );

        // Step 17: Verify changes in Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'No',
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.BIOGRAPHICAL_HISTORICAL_DATA,
          `${newBiographicalNoteA} ${biographicalNoteU1} ${newBiographicalNoteU2}`,
        );
        InstanceRecordView.verifyRecentLastUpdatedDateAndTime();

        // Step 18: Verify changes in MARC source
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(
          '545',
          `\t545\t0  \t$a ${newBiographicalNoteA} $u ${biographicalNoteU1} $u ${newBiographicalNoteU2}`,
        );
        InventoryViewSource.verifyFieldContent(
          3,
          DateTools.getFormattedEndDateWithTimUTC(new Date()),
        );
      },
    );
  });
});
