import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import parseMrcFileContentAndVerify from '../../../../support/utils/parseMrcFileContent';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import DateTools from '../../../../support/utils/dateTools';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let locationId;
let locationName;
let loanTypeId;
let materialTypeId;
let sourceId;
let statisticalCode;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileNameCsv;
let previewQueryFileNameMrc;
let changedRecordsQueryFileNameCsv;
let changedRecordsQueryFileNameMrc;
const itemBarcode = getRandomPostfix();
const administrativeNoteText = "Administrative note ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,";
const administrativeNoteActionOptions = ['Add note', 'Find', 'Remove all'];
const ldrValue = '00270naa a2200085uu 4500';
const marcInstance = {
  title: `AT_C648456_MarcInstance_${randomFourDigitNumber()}`,
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
];
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getStatisticalCodes({ limit: 1 }).then((code) => {
          statisticalCode = code[0];

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            marcInstance.uuid = instanceId;

            cy.getLocations({ limit: 1 }).then((res) => {
              locationId = res.id;
              locationName = res.name;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((res) => {
              materialTypeId = res.id;
            });
            InventoryHoldings.getHoldingsFolioSource()
              .then((folioSource) => {
                sourceId = folioSource.id;
              })
              .then(() => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: marcInstance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holdingData) => {
                  cy.createItem({
                    holdingsRecordId: holdingData.id,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    barcode: itemBarcode,
                  });
                });
              });

            cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;
              instanceData.statisticalCodeIds = [statisticalCode.id];

              cy.updateInstance(instanceData);
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.instanceSource);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('MARC');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.statisticalCodeNames, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS_ANY, 1);
          QueryModal.chooseFromValueMultiselect(statisticalCode.name, 1);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 2);
          QueryModal.fillInValueTextfield(marcInstance.title, 2);
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `${todayDate}-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileNameCsv = `${todayDate}-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            previewQueryFileNameMrc = `${todayDate}-Updates-Preview-MARC-Query-${interceptedUuid}.mrc`;
            changedRecordsQueryFileNameCsv = `${todayDate}-Changed-Records-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileNameMrc = `${todayDate}-Changed-Records-MARC-Query-${interceptedUuid}.mrc`;
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
      FileManager.deleteFileFromDownloadsByMask(
        previewQueryFileNameCsv,
        previewQueryFileNameMrc,
        identifiersQueryFilename,
        matchedRecordsQueryFileName,
        changedRecordsQueryFileNameCsv,
        changedRecordsQueryFileNameMrc,
      );
    });

    it(
      'C648456 Bulk edit administrative data for all records (MARC, Query, Logs) (firebird)',
      { tags: ['smoke', 'firebird', 'C648456'] },
      () => {
        BulkEditActions.openActions();
        BulkEditActions.verifyStartBulkEditOptions();
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
        );
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsQueryFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
        );
        BulkEditActions.openStartBulkEditMarcInstanceForm();
        BulkEditActions.verifyInitialStateBulkEditsFormForMarcInstance();
        BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
        BulkEditActions.verifyTheActionOptions(administrativeNoteActionOptions);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow();
        BulkEditActions.selectOption('Staff suppress', 1);
        BulkEditSearchPane.verifyInputLabel('Staff suppress', 1);
        BulkEditActions.selectSecondAction('Set true', 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Statistical code', 2);
        BulkEditSearchPane.verifyInputLabel('Statistical code', 2);
        BulkEditActions.selectSecondAction('Remove all', 2);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.selectOption('Suppress from discovery', 3);
        BulkEditSearchPane.verifyInputLabel('Suppress from discovery', 3);
        BulkEditActions.selectSecondAction('Set true', 3);
        BulkEditActions.applyToHoldingsItemsRecordsCheckboxExists(true, 3);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            value: administrativeNoteText,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            value: 'true',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            value: 'true',
          },
        ];
        const editedHeaderValuesInFile = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.ADMINISTRATIVE_NOTE,
            value: administrativeNoteText,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
            value: true,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STATISTICAL_CODE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
            value: true,
          },
        ];

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          marcInstance.hrid,
          editedHeaderValues,
        );
        BulkEditActions.verifyAreYouSureForm(1);
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);
        BulkEditActions.verifyDownloadPreviewInMarcFormatButtonEnabled();
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewQueryFileNameCsv,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          editedHeaderValuesInFile,
        );
        BulkEditActions.downloadPreviewInMarcFormat();

        const assertionsOnMarcFileContent = [
          {
            uuid: marcInstance.uuid,
            assertions: [
              (record) => expect(record.leader).to.eq(ldrValue),

              (record) => expect(record.get('245')[0].ind1).to.eq('1'),
              (record) => expect(record.get('245')[0].ind2).to.eq('0'),
              (record) => expect(record.get('245')[0].subf[0][0]).to.eq('a'),
              (record) => {
                expect(record.get('245')[0].subf[0][1]).to.eq(marcInstance.title);
              },

              (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
              (record) => expect(record.get('999')[0].subf[0][1]).to.eq(marcInstance.uuid),
            ],
          },
        ];

        parseMrcFileContentAndVerify(previewQueryFileNameMrc, assertionsOnMarcFileContent, 1);

        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          marcInstance.hrid,
          editedHeaderValues,
        );
        BulkEditSearchPane.verifyPaginatorInChangedRecords(1);
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsQueryFileNameCsv,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          editedHeaderValuesInFile,
        );
        BulkEditActions.downloadChangedMarc();

        parseMrcFileContentAndVerify(
          changedRecordsQueryFileNameMrc,
          assertionsOnMarcFileContent,
          1,
        );

        // remove earlier downloaded files
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsQueryFileName,
          previewQueryFileNameCsv,
          previewQueryFileNameMrc,
          changedRecordsQueryFileNameCsv,
          changedRecordsQueryFileNameMrc,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyAdministrativeNote(administrativeNoteText);
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndSuppressed();
        InstanceRecordView.verifyStatisticalCodeTypeAndName('No value set-', 'No value set-');
        InventoryInstance.viewHoldings();
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(locationName);
        InventoryInstance.openItemByBarcode(itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.suppressedAsDiscoveryIsPresent();
        ItemRecordView.closeDetailView();
        InstanceRecordView.viewSource();
        InventoryViewSource.checkFieldContentMatch('LDR', /00270naa a2200085uu 4500/);
        InventoryViewSource.verifyFieldInMARCBibSource(
          '245',
          `\t245\t1 0\t$a ${marcInstance.title}`,
        );
        InventoryViewSource.verifyAbsenceOfValue(administrativeNoteText);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.verifyLogStatus(user.username, 'Inventory - instances (MARC)');
        BulkEditLogs.verifyLogStatus(user.username, 'In app');
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.verifyLogsRowActionWhenCompletedWithQuery(true);
        BulkEditLogs.downloadQueryIdentifiers();
        ExportFile.verifyFileIncludes(identifiersQueryFilename, [marcInstance.uuid]);
        BulkEditFiles.verifyCSVFileRecordsNumber(identifiersQueryFilename, 1);
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsQueryFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
        );
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          previewQueryFileNameCsv,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          editedHeaderValuesInFile,
        );
        BulkEditLogs.downloadFileWithProposedChangesMarc();

        parseMrcFileContentAndVerify(previewQueryFileNameMrc, assertionsOnMarcFileContent, 1);

        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          changedRecordsQueryFileNameCsv,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_UUID,
          marcInstance.uuid,
          editedHeaderValuesInFile,
        );
        BulkEditLogs.downloadFileWithUpdatedRecordsMarc();

        parseMrcFileContentAndVerify(
          changedRecordsQueryFileNameMrc,
          assertionsOnMarcFileContent,
          1,
        );
      },
    );
  });
});
