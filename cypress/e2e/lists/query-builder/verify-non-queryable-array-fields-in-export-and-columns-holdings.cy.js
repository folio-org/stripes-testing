import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import ListsFile, { holdingsCsvHeaders } from '../../../support/fragments/lists/lists-file';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451502_List_${getRandomPostfix()}`;
const listDescription = `AT_C451502_Description_${getRandomPostfix()}`;
const testData = {
  instanceTitle: `AT_C451502_Instance_${getRandomPostfix()}`,
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

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
        }).then((instanceIds) => {
          testData.instanceId = instanceIds.instanceId;

          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: testData.instanceId,
            permanentLocationId: testData.locationId,
            sourceId: testData.holdingsSourceId,
            statisticalCodeIds: testData.statisticalCodes,
            discoverySuppress: true,
          }).then((holdings) => {
            testData.holdingsId = holdings.id;
            testData.holdingsHrid = holdings.hrid;
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
      'C451502 [Holdings] Verify that Non-Queryable array type fields are part of exported .csv files and column selection (corsair)',
      { tags: ['extendedPath', 'corsair', 'C451502'] },
      () => {
        // Define columns to verify
        const arrayTypeColumns = [
          holdingsFieldValues.holdingsStatisticalCodeUuids,
          holdingsFieldValues.holdingsStatisticalCodeNames,
        ];

        // Step 1: Create new list with Holdings record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.setDescription(listDescription);
        Lists.selectRecordType(Lists.recordTypes.holdings);
        Lists.buildQuery();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Configure query condition: Holdings — Suppress from discovery, equals True
        QueryModal.selectField(holdingsFieldValues.suppressFromDiscovery);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.selectValueFromSelect('True');

        // Add second query condition to filter by holdings HRID to get only our test holdings
        QueryModal.addNewRow();
        QueryModal.selectField(holdingsFieldValues.holdingsHrid, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.holdingsHrid, 1);
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryAndSaveDisabled(true);

        // Step 3: Test query and verify preview of found records
        QueryModal.testQuery();
        QueryModal.verifyNumberOfRowsInPreviewTable(1);
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryAndSaveDisabled(false);

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

        arrayTypeColumns.forEach((column) => {
          QueryModal.verifyCheckboxInShowColumnsChecked(column, false);
        });

        // Step 7: Enable checkboxes for array type fields
        arrayTypeColumns.forEach((column) => {
          QueryModal.selectCheckboxInShowColumns(column);
          QueryModal.verifyCheckboxInShowColumnsChecked(column, true);
        });

        // Step 8: Export selected columns and verify CSV
        Lists.exportListVisibleColumns();
        Lists.verifyCalloutMessage(
          `Export of ${listName} is being generated. This may take some time for larger lists.`,
        );
        Lists.verifyCalloutMessage(`List ${listName} was successfully exported to CSV.`);
        ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
          listName,
          holdingsCsvHeaders.holdingsHrid,
          testData.holdingsHrid,
          [
            {
              header: holdingsCsvHeaders.holdingsStatisticalCodeUuids,
              value: testData.statisticalCodeUuids,
            },
            {
              header: holdingsCsvHeaders.holdingsStatisticalCodeNames,
              value: testData.statisticalCode.fullName,
            },
          ],
        );
      },
    );
  });
});
