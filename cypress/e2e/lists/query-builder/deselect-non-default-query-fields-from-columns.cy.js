import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451555_List_${getRandomPostfix()}`;
const testData = {
  copyNumber: `AT_C451555_CopyNumber_${getRandomPostfix()}`,
  instanceTitle: `AT_C451555_Instance_${getRandomPostfix()}`,
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();

      // Create instance with holding that has unique copy number
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });

      cy.getLocations({ limit: 1 }).then((location) => {
        testData.locationId = location.id;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: testData.instanceTitle,
            instanceTypeId: testData.instanceTypeId,
          },
          holdings: [
            {
              permanentLocationId: testData.locationId,
              copyNumber: testData.copyNumber,
            },
          ],
        }).then((createdInstance) => {
          testData.instanceId = createdInstance.instanceId;
          testData.holdingId = createdInstance.holdings[0].id;
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Lists.deleteListByNameViaApi(listName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C451555 Non-default fields that are part of the query can be deselected as columns (corsair)',
      { tags: ['extendedPath', 'corsair', 'C451555'] },
      () => {
        // Define columns used in test
        const allDefaultColumns = [
          holdingsFieldValues.holdingsHrid,
          holdingsFieldValues.updatedDate,
          holdingsFieldValues.effectiveLibraryName,
          holdingsFieldValues.effectiveLocationName,
          holdingsFieldValues.permanentLocation,
          holdingsFieldValues.temporaryLocation,
          holdingsFieldValues.copyNumber,
        ];

        const columnsToDeselect = [
          holdingsFieldValues.updatedDate,
          holdingsFieldValues.effectiveLibraryName,
          holdingsFieldValues.effectiveLocationName,
          holdingsFieldValues.permanentLocation,
          holdingsFieldValues.temporaryLocation,
          holdingsFieldValues.copyNumber,
        ];

        // Step 1: Create new list with Holdings record type and build query
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.holdings);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Query for the specific holding by its unique copy number
        QueryModal.selectField(holdingsFieldValues.copyNumber);
        QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
        QueryModal.fillInValueTextfield('non-existent-value');
        QueryModal.addNewRow();
        QueryModal.selectField(holdingsFieldValues.copyNumber, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.copyNumber, 1);
        QueryModal.testQuery();

        // Step 3: Verify preview of matched records and default columns are displayed
        QueryModal.verifyPreviewOfRecordsMatched();

        allDefaultColumns.forEach((column) => {
          QueryModal.verifyColumnDisplayed(column);
        });

        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryDisabled(false);

        // Step 4: Deselect columns using "Show columns" button
        QueryModal.clickShowColumnsButton();

        columnsToDeselect.forEach((column) => {
          QueryModal.clickCheckboxInShowColumns(column);
        });

        // Verify only "Holdings — HRID" column remains
        QueryModal.verifyColumnDisplayed(holdingsFieldValues.holdingsHrid);

        columnsToDeselect.forEach((column) => {
          QueryModal.verifyColumnDisplayed(column, false);
        });

        // Step 5: Run query and save
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();

        // Step 6: View updated list and verify column display persists
        Lists.verifyRefreshCompleteCallout(1);
        Lists.viewUpdatedList();
        QueryModal.verifyColumnDisplayed(holdingsFieldValues.holdingsHrid);

        columnsToDeselect.forEach((column) => {
          QueryModal.verifyColumnDisplayed(column, false);
        });
      },
    );
  });
});
