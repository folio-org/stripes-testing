import TopMenu from '../../../../support/fragments/topMenu';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { BULK_EDIT_TABLE_COLUMN_HEADERS, ITEM_STATUS_NAMES } from '../../../../support/constants';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import DateTools from '../../../../support/utils/dateTools';

let user;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
const instance = {
  title: `AT_C436913_FolioInstance_${getRandomPostfix()}`,
  item1: {
    barcode: getRandomPostfix(),
  },
  item2: {
    barcode: getRandomPostfix(),
  },
};
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const matchedRecordsFileName = '*-Matched-Records-Query-*';

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data and run query', () => {
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditDeleteItems.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instance.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            instance.holdingTypeId = holdingTypes[0].id;
          });
          cy.getLocations({ limit: 1 }).then((locationData) => {
            instance.locationId = locationData.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((loanTypeData) => {
            instance.loanTypeId = loanTypeData[0].id;
          });
          cy.getMaterialTypes({ limit: 1 })
            .then((materialTypeData) => {
              instance.materialTypeId = materialTypeData.id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instance.instanceTypeId,
                  title: instance.title,
                },
                holdings: [
                  {
                    holdingsTypeId: instance.holdingTypeId,
                    permanentLocationId: instance.locationId,
                  },
                ],
                items: [
                  {
                    barcode: instance.item1.barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: instance.loanTypeId },
                    materialType: { id: instance.materialTypeId },
                  },
                  {
                    barcode: instance.item2.barcode,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: instance.loanTypeId },
                    materialType: { id: instance.materialTypeId },
                  },
                ],
              }).then((instanceData) => {
                instance.id = instanceData.instanceId;
                instance.item1.id = instanceData.items[0].id;
                instance.item2.id = instanceData.items[1].id;
              });
            });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(itemFieldValues.instanceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(instance.title);
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `${today}-Matched-Records-Query-${interceptedUuid}.csv`;
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName, identifiersQueryFilename);
      });

      it(
        'C436913 Verify generated Logs files for Items (Query) (firebird)',
        { tags: ['criticalPath', 'firebird', 'C436913'] },
        () => {
          // Step 1: Check "Inventory - items" checkbox on "Record types" filter accordion
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkItemsCheckbox();

          // Step 2: Check values in Status and Editing columns
          BulkEditLogs.verifyLogStatus(user.username, 'Data modification');
          BulkEditLogs.verifyEditingColumnValue(user.username, 'Query');

          // Step 3: Click on the ... action element
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenRunQuery();

          // Step 4: Download identifiers file
          BulkEditLogs.downloadQueryIdentifiers();
          ExportFile.verifyFileIncludes(identifiersQueryFilename, [
            instance.item1.id,
            instance.item2.id,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(identifiersQueryFilename, 2);

          // Step 5: Download matching records file
          BulkEditLogs.downloadFileWithMatchingRecords();

          [instance.item1, instance.item2].forEach((item) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsQueryFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              item.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              item.id,
            );
          });

          BulkEditFiles.verifyCSVFileRowsRecordsNumber(matchedRecordsQueryFileName, 2);
        },
      );
    });
  });
});
