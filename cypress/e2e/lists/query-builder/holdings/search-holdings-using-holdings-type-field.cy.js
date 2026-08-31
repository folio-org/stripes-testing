import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  holdingsFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { HOLDINGS_TYPE_NAMES } from '../../../../support/constants/constants';

let user;
const instanceTitle = `AT_C958450_Instance_${getRandomPostfix()}`;
const testData = {
  instanceTypeId: null,
  holdingTypeId: null,
  defaultLocation: {},
  instanceId: null,
  holdingId: null,
  holdingHrid: null,
  holdingsTypeName: null,
};
const listData = {
  name: `AT_C958450_List_${getRandomPostfix()}`,
  description: `AT_C958450_${getTestEntityValue('desc')}`,
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Holdings', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C958450');

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ query: `name=="${HOLDINGS_TYPE_NAMES.MONOGRAPH}"` }).then(
          (holdingTypes) => {
            testData.holdingTypeId = holdingTypes[0].id;
            testData.holdingsTypeName = holdingTypes[0].name;
          },
        );
        cy.getLocations({ limit: 1 })
          .then((res) => {
            testData.defaultLocation = res;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                },
              ],
            });
          })
          .then((createdInstance) => {
            testData.instanceId = createdInstance.instanceId;
            testData.holdingId = createdInstance.holdingIds[0].id;

            // Get holding HRID
            cy.getHoldings({ query: `"id"=="${testData.holdingId}"` }).then((holdings) => {
              testData.holdingHrid = holdings[0].hrid;
            });
          })
          .then(() => {
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
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C958450 Search holdings in the Query Builder using "Holdings type — Type" field (athena)',
        { tags: ['criticalPath', 'athena', 'C958450'] },
        () => {
          // Step 1: Create new list with Holdings record type
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.holdings);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Open Build query modal
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 3: Configure query with Holdings type field
          QueryModal.selectField(holdingsFieldValues.holdingsTypeType);
          QueryModal.verifySelectedField(holdingsFieldValues.holdingsTypeType);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.selectValueFromSelect(testData.holdingsTypeName);
          QueryModal.verifySelectedValue(testData.holdingsTypeName);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 4: Test query
          QueryModal.clickTestQuery();

          // Step 5: Verify preview of found records
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(false);
          Lists.verifyQueryValue(
            testData.holdingsTypeName,
            QUERY_OPERATIONS.EQUAL,
            'list-column-holdings_type.name',
            testData.holdingsTypeName,
          );

          // Step 6: Run query & save
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listData.name);
          Lists.waitForCompilingToComplete();
        },
      );
    });
  });
});
