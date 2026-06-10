import Permissions from '../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { LOCATION_NAMES } from '../../../support/constants/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451512_List_${getRandomPostfix()}`;
const listDescription = `AT_C451512_Description_${getRandomPostfix()}`;
const testData = {
  instanceTitle: `AT_C451512_Instance_${getRandomPostfix()}`,
  callNumber: `AT_C451512_CallNumber_${getRandomPostfix()}`,
  instanceId: null,
  holdingHrid: null,
  holdingUuid: null,
  holdingVersion: null,
  annexLocationId: null,
  instanceTypeId: null,
};
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test data and login', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      cy.getLocations({ query: `name=="${LOCATION_NAMES.ANNEX_UI}"` }).then((locations) => {
        testData.annexLocationId = locations.id;
      });
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: testData.instanceTitle,
            instanceTypeId: testData.instanceTypeId,
          },
          holdings: [
            {
              permanentLocationId: testData.annexLocationId,
              callNumber: testData.callNumber,
            },
          ],
        }).then((createdInstance) => {
          testData.instanceId = createdInstance.instanceId;

          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${createdInstance.instanceId}"`,
          }).then((holdings) => {
            testData.holdingUuid = holdings[0].id;
            testData.holdingHrid = holdings[0].hrid;
            testData.holdingVersion = `${holdings[0]._version}` || '1';
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Lists.deleteListByNameViaApi(listName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C451512 Verify that newly selected columns are populated with data (corsair)',
      { tags: ['criticalPath', 'corsair', 'C451512'] },
      () => {
        // Step 1: Create new list with Holdings record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.setDescription(listDescription);
        Lists.selectRecordType(Lists.recordTypes.holdings);
        Lists.buildQuery();
        QueryModal.verify();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2: Configure query: Holdings effective location — Name equals Annex AND Call number equals unique value
        QueryModal.selectField(holdingsFieldValues.effectiveLocationName);
        QueryModal.verifySelectedField(holdingsFieldValues.effectiveLocationName);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.selectValueFromSelect(LOCATION_NAMES.ANNEX_UI);
        QueryModal.verifySelectedValue(LOCATION_NAMES.ANNEX_UI);

        // Add second query condition: Call number equals unique value
        QueryModal.addNewRow();
        QueryModal.selectField(holdingsFieldValues.callNumber, 1);
        QueryModal.verifySelectedField(holdingsFieldValues.callNumber, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.callNumber, 1);
        QueryModal.verifyTextFieldValue(testData.callNumber, 1);

        QueryModal.testQuery();
        QueryModal.waitForQueryTestToFinish();
        QueryModal.clickShowColumnsButton();

        const columnsToActivate = [
          holdingsFieldValues.holdingsUuid,
          holdingsFieldValues.recordVersion,
          holdingsFieldValues.instanceUuid,
        ];

        columnsToActivate.forEach((column) => {
          QueryModal.selectCheckboxInShowColumns(column);
        });

        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.callNumber,
          holdingsFieldValues.holdingsUuid,
          testData.holdingUuid,
        );
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.callNumber,
          holdingsFieldValues.recordVersion,
          testData.holdingVersion,
        );
        QueryModal.verifyMatchedRecordsByIdentifier(
          testData.callNumber,
          holdingsFieldValues.instanceUuid,
          testData.instanceId,
        );

        columnsToActivate.forEach((column) => {
          QueryModal.selectCheckboxInShowColumns(column);
          QueryModal.verifyColumnDisplayed(column, false);
        });

        QueryModal.clickRunQueryAndSave();
        Lists.verifySuccessCalloutMessage(`List ${listName} saved.`);
        QueryModal.verifyClosed();

        // Step 3: View updated list
        Lists.verifyRefreshCompleteCallout(1);
        Lists.waitForCompilingToComplete();

        // Step 4: Activate columns and verify data population
        Lists.openActions();

        columnsToActivate.forEach((column) => {
          Lists.selectResultColumn(column);
        });

        // Verify columns are populated with data (not empty)
        QueryModal.verifyColumnValueForRow(
          testData.holdingHrid,
          holdingsFieldValues.holdingsUuid,
          testData.holdingUuid,
        );
        QueryModal.verifyColumnValueForRow(
          testData.holdingHrid,
          holdingsFieldValues.instanceUuid,
          testData.instanceId,
        );
        QueryModal.verifyColumnValueForRow(
          testData.holdingHrid,
          holdingsFieldValues.recordVersion,
          testData.holdingVersion,
        );
      },
    );
  });
});
