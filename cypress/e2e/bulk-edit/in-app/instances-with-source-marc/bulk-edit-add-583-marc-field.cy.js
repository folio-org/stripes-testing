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
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const marcInstance = {
  title: `AT_C503070_MarcInstance_${getRandomPostfix()}`,
};
const actionNote = 'Action note text';
const instanceUUIDsFileName = `instanceUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(instanceUUIDsFileName);
const previewFileNameMrc = BulkEditFiles.getPreviewMarcFileName(instanceUUIDsFileName, true);
const previewFileNameCsv = BulkEditFiles.getPreviewFileName(instanceUUIDsFileName, true);
const changedRecordsFileNameMrc = BulkEditFiles.getChangedRecordsMarcFileName(
  instanceUUIDsFileName,
  true,
);
const changedRecordsFileNameCsv = BulkEditFiles.getChangedRecordsFileName(
  instanceUUIDsFileName,
  true,
);

describe('bulk-edit', () => {
  describe(
    'In-app approach',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.bulkEditLogsView.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
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
        FileManager.deleteFileFromDownloadsByMask(
          previewFileNameMrc,
          previewFileNameCsv,
          changedRecordsFileNameMrc,
          changedRecordsFileNameCsv,
          matchedRecordsFileName,
          instanceUUIDsFileName,
        );
      });

      it(
        'C503070 Add MARC field (583) mapped to Inventory Instance (MARC, Logs) (firebird)',
        { tags: ['smoke', 'firebird', 'C503070'] },
        () => {
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SOURCE,
            'MARC',
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
          );
          BulkEditActions.openStartBulkEditMarcInstanceForm();
          BulkEditActions.verifyInitialStateBulkEditMarcFieldsForm(
            instanceUUIDsFileName,
            '1 instance',
          );
          BulkEditActions.fillInTagAndIndicatorsAndSubfield('583', '0', '\\', 'a');
          BulkEditActions.selectActionForMarcInstance('Add');
          BulkEditActions.verifySelectSecondActionRequired(false);
          BulkEditActions.fillInDataTextAreaForMarcInstance(actionNote);
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
            `${actionNote} (staff only)`,
          );
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
          BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
          BulkEditActions.downloadPreviewInMarcFormat();

          const assertionsOnMarcFileContent = [
            (record) => expect(record.leader).to.exist,
            (record) => expect(record.get('001')).to.not.be.empty,
            (record) => expect(record.get('005')).to.not.be.empty,
            (record) => expect(record.get('008')).to.not.be.empty,

            (record) => expect(record.get('583')[0].ind1).to.eq('0'),
            (record) => expect(record.get('583')[0].ind2).to.eq(' '),
            (record) => expect(record.get('583')[0].subf[0][0]).to.eq('a'),
            (record) => expect(record.get('583')[0].subf[0][1]).to.eq(actionNote),

            (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
            (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
          ];

          parseMrcFileContentAndVerify(previewFileNameMrc, 0, assertionsOnMarcFileContent, 1);

          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE};${actionNote};true`,
          );
          BulkEditActions.commitChanges();

          const updateDate = new Date();

          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            marcInstance.hrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
            `${actionNote} (staff only)`,
          );
          BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedMarc();

          parseMrcFileContentAndVerify(
            changedRecordsFileNameMrc,
            0,
            assertionsOnMarcFileContent,
            1,
          );

          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE};${actionNote};true`,
          );

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
          FileManager.deleteFileFromDownloadsByMask(
            previewFileNameMrc,
            previewFileNameCsv,
            changedRecordsFileNameMrc,
            changedRecordsFileNameCsv,
          );

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkInstancesCheckbox();
          BulkEditLogs.verifyLogStatus(user.username, 'Inventory - instances (MARC)');
          BulkEditLogs.verifyLogStatus(user.username, 'In app');
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted(true);
          BulkEditLogs.downloadFileUsedToTrigger();
          BulkEditFiles.verifyCSVFileRows(instanceUUIDsFileName, [marcInstance.uuid]);
          BulkEditFiles.verifyCSVFileRecordsNumber(instanceUUIDsFileName, 1);
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            matchedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
            marcInstance.uuid,
            'Notes',
            '',
          );
          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyValueInRowByUUID(
            previewFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE};${actionNote};true`,
          );
          BulkEditLogs.downloadFileWithProposedChangesMarc();

          parseMrcFileContentAndVerify(previewFileNameMrc, 0, assertionsOnMarcFileContent, 1);

          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            changedRecordsFileNameCsv,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
            marcInstance.hrid,
            'Notes',
            `${BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE};${actionNote};true`,
          );
          BulkEditLogs.downloadFileWithUpdatedRecordsMarc();

          parseMrcFileContentAndVerify(
            changedRecordsFileNameMrc,
            0,
            assertionsOnMarcFileContent,
            1,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyRecentLastUpdatedDateAndTime();
          InstanceRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'Yes',
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ACTION_NOTE,
            actionNote,
          );
          InstanceRecordView.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource('583', `\t583\t0  \t$a ${actionNote} `);
          InventoryViewSource.verifyFieldContent(3, updateDate);
        },
      );
    },
  );
});
