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

const listName = `AT_C451554_List_${getRandomPostfix()}`;
const testData = {
  instanceTitle: `AT_C451554_Instance_${getRandomPostfix()}`,
  copyNumber: `AT_C451554_CopyNumber_${getRandomPostfix()}`,
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    const defaultHoldingsColumns = [
      holdingsFieldValues.holdingsHrid,
      holdingsFieldValues.updatedDate,
      holdingsFieldValues.effectiveLibraryName,
      holdingsFieldValues.effectiveLocationName,
      holdingsFieldValues.permanentLocation,
    ];

    before('Create test data and login', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();

      // Create instance with holding that has suppress from discovery = true
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
              discoverySuppress: true,
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
      'C451554 Non-default fields that are part of the query are automatically displayed as columns (corsair)',
      { tags: ['extendedPath', 'corsair', 'C451554'] },
      () => {
        // Step 1: Create new list with Holdings record type and build query
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.selectRecordType(Lists.recordTypes.holdings);
        Lists.buildQuery();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Query for holdings with suppress from discovery = true and specific copy number
        QueryModal.selectField(holdingsFieldValues.suppressFromDiscovery);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.addNewRow();
        QueryModal.selectField(holdingsFieldValues.copyNumber, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.copyNumber, 1);
        QueryModal.testQuery();

        // Step 3: Verify preview of matched records and columns are displayed
        [
          holdingsFieldValues.holdingsHrid,
          holdingsFieldValues.updatedDate,
          holdingsFieldValues.effectiveLibraryName,
        ].forEach((column) => {
          QueryModal.verifyColumnDisplayed(column);
        });

        QueryModal.scrollResultTable('right');

        [holdingsFieldValues.effectiveLocationName, holdingsFieldValues.permanentLocation].forEach(
          (column) => {
            QueryModal.verifyColumnDisplayed(column);
          },
        );

        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.copyNumber,
          holdingsFieldValues.temporaryLocation,
          '',
        );
        // Verify non-default query field is automatically displayed
        QueryModal.scrollResultTable('left');
        QueryModal.verifyColumnDisplayed(holdingsFieldValues.suppressFromDiscovery);
        QueryModal.testQueryDisabled(false);
        QueryModal.cancelDisabled(false);
        QueryModal.runQueryAndSaveDisabled(false);

        // Step 4: Run query and save
        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();

        // Step 5: View updated list and verify columns persist
        Lists.verifyRefreshCompleteCallout(1);
        Lists.viewUpdatedList();

        defaultHoldingsColumns.forEach((column) => {
          QueryModal.verifyColumnDisplayed(column);
        });

        QueryModal.verifyColumnValueForRow(
          testData.copyNumber,
          holdingsFieldValues.temporaryLocation,
          '',
        );
        QueryModal.verifyColumnDisplayed(holdingsFieldValues.suppressFromDiscovery);
      },
    );
  });
});
