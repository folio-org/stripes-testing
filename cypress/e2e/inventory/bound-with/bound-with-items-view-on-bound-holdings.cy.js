import uuid from 'uuid';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Bound-with. One item related to multiple holdings', () => {
    let user;
    const testData = {
      holdingsLocation: LOCATION_NAMES.MAIN_LIBRARY_UI,
      firstInstanceTitle: `C409512 firstAutotestInstance_${getRandomPostfix()}`,
      firstItemBarcode: uuid(),
      secondInstanceTitle: `C409512 secondAutotestInstance_${getRandomPostfix()}`,
      secondItemBarcode: uuid(),
      thirdInstanceTitle: `C409512 thirdAutotestInstance_${getRandomPostfix()}`,
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((locations) => {
            testData.locationsId = locations.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          // create the first Instance with holdings and item
          const instanceId1 = InventoryInstances.createInstanceViaApi(
            testData.firstInstanceTitle,
            testData.firstItemBarcode,
          );
          cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId1}"` }).then((holdings) => {
            testData.firstHoldingsHRID = holdings[0].hrid;
          });

          // create the second Instance with holdings and item
          const instanceId2 = InventoryInstances.createInstanceViaApi(
            testData.secondInstanceTitle,
            testData.secondItemBarcode,
          );
          cy.getHoldings({ limit: 1, query: `"instanceId"="${instanceId2}"` }).then((holdings) => {
            testData.secondHoldingsHRID = holdings[0].hrid;
          });

          // create the third Instance with holdings and items
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.thirdInstanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [
              {
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
                boundWithTitles: [{ briefHoldingsRecord: { hrid: testData.firstHoldingsHRID } }],
              },
              {
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
                boundWithTitles: [{ briefHoldingsRecord: { hrid: testData.secondHoldingsHRID } }],
              },
              {
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
              {
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
              {
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
              {
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
              {
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            testData.instanceIds = specialInstanceIds;
          });

          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          testData.firstItemBarcode,
        );
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          testData.secondItemBarcode,
        );
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.instanceIds.instanceId,
        );
      });
    });

    it(
      'C409512 Verify the Bound-with items view on bound holdings (sif)',
      { tags: ['criticalPath', 'sif', 'C409512'] },
      () => {
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.firstInstanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InventoryInstance.openHoldingsAccordion(`${testData.holdingsLocation} >`);
        InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(testData.holdingsLocation, 2);
        InventoryInstance.verifyItemBarcode(testData.firstItemBarcode);
        InventorySearchAndFilter.resetAll();

        InventorySearchAndFilter.searchByParameter('Title (all)', testData.secondInstanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InventoryInstance.openHoldingsAccordion(`${testData.holdingsLocation} >`);
        InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(testData.holdingsLocation, 2);
        InventoryInstance.verifyItemBarcode(testData.secondItemBarcode);
      },
    );
  });
});
