import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import ListsFile, { itemCsvHeaders } from '../../../support/fragments/lists/lists-file';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

const listName = `AT_C451501_List_${getRandomPostfix()}`;
const listDescription = `AT_C451501_Description_${getRandomPostfix()}`;
const testData = {
  instanceTitle: `AT_C451501_Instance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
  statisticalCodes: [],
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      cy.getStatisticalCodes({ limit: 1 }).then((codes) => {
        testData.statisticalCode = codes[0];
        testData.statisticalCodes = [testData.statisticalCode.id];
        testData.statisticalCodeUuids = testData.statisticalCode.id;

        cy.getStatisticalCodeTypes({ limit: 200 }).then((codeTypes) => {
          const codeType = codeTypes.find(
            (item) => item.id === testData.statisticalCode.statisticalCodeTypeId,
          );
          testData.statisticalCode.fullName = `${codeType.name}: ${testData.statisticalCode.code} - ${testData.statisticalCode.name}`;
        });
      });
      InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
        testData.holdingsSourceId = folioSource.id;
      });
      cy.getLocations({ limit: 1 }).then((res) => {
        testData.locationId = res.id;
      });
      cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
        testData.holdingTypeId = holdingTypes[0].id;
      });
      cy.getDefaultMaterialType().then((materialType) => {
        testData.materialTypeId = materialType.id;
      });
      cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
        testData.loanTypeId = loanTypes[0].id;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.locationId,
            },
          ],
          items: [
            {
              barcode: testData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              materialType: { id: testData.materialTypeId },
              permanentLoanType: { id: testData.loanTypeId },
              statisticalCodeIds: testData.statisticalCodes,
            },
          ],
        }).then((createdInstanceData) => {
          testData.instanceId = createdInstanceData.instanceId;

          testData.holdingsId = createdInstanceData.holdingIds[0].id;
          cy.getHoldings({ limit: 1, query: `"id"=="${testData.holdingsId}"` }).then((holdings) => {
            testData.holdingsHrid = holdings[0].hrid;
          });
        });
      });

      cy.createTempUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listName);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Users.deleteViaApi(user.userId);
      Lists.deleteDownloadedFile(listName);
    });

    it(
      'C451501 [Items] Verify that Non-Queryable array type fields are part of exported .csv files and column selection (corsair)',
      { tags: ['extendedPath', 'corsair', 'C451501'] },
      () => {
        // Step 1: Create new list with Items record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.setDescription(listDescription);
        Lists.selectRecordType(Lists.recordTypes.items);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Configure query condition: Holdings — UUID, not in
        QueryModal.selectField(itemFieldValues.holdingsId);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
        QueryModal.fillInValueTextfield('test');

        // Add second query condition to filter by holdings HRID to get only our test holdings
        QueryModal.addNewRow();
        QueryModal.selectField(itemFieldValues.holdingsHrid, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.holdingsHrid, 1);
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(true);

        // Step 3: Test query and verify preview of found records
        QueryModal.testQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.verifyNumberOfRowsInPreviewTable(1);
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 4: Run query and save
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();

        // Step 5: View updated list
        Lists.verifyRefreshCompleteCallout(1);
        Lists.viewUpdatedList();
        Lists.waitForCompilingToComplete();

        // Step 6: Open Actions and check available columns in "Show columns"
        Lists.openActions();
        QueryModal.verifyCheckboxInShowColumnsChecked(
          itemFieldValues.itemStatisticalCodeNames,
          false,
        );

        // Step 7: Enable checkboxes for array type fields
        QueryModal.selectCheckboxInShowColumns(itemFieldValues.itemStatisticalCodeNames);
        QueryModal.verifyCheckboxInShowColumnsChecked(
          itemFieldValues.itemStatisticalCodeNames,
          true,
        );
        QueryModal.verifyColumnValueForRow(
          testData.instanceTitle,
          itemFieldValues.itemStatisticalCodeNames,
          testData.statisticalCode.fullName,
        );

        // Step 8: Export selected columns and verify CSV
        Lists.exportListVisibleColumns();
        Lists.verifyCalloutMessage(
          `Export of ${listName} is being generated. This may take some time for larger lists.`,
        );
        Lists.verifyCalloutMessage(`List ${listName} was successfully exported to CSV.`);
        ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
          listName,
          itemCsvHeaders.instanceTitle,
          testData.instanceTitle,
          [
            {
              header: itemCsvHeaders.itemStatisticalCodeNames,
              value: testData.statisticalCode.fullName,
            },
          ],
        );
      },
    );
  });
});
