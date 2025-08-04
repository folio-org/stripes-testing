import uuid from 'uuid';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      firstLocationUI: LOCATION_NAMES.ANNEX_UI,
      secondLocationUI: LOCATION_NAMES.MAIN_LIBRARY_UI,
      itemBarcode: uuid(),
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${testData.firstLocationUI}"` }).then((locations) => {
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
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [
              {
                barcode: testData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            testData.testInstanceIds = specialInstanceIds;

            cy.getLocations({ query: `name="${testData.secondLocationUI}"` }).then((locations) => {
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.testInstanceIds.instanceId,
                  permanentLocationId: locations.id,
                  sourceId: folioSource.id,
                });
              });
            });
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiInventoryMoveItems.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      });
    });

    it(
      'C519985 Check "Move items within an Instance" action for Instance with more than one holding (folijet)',
      { tags: ['extendedPath', 'folijet', 'C519985'] },
      () => {
        InventoryInstances.searchByTitle(testData.testInstanceIds.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.moveItemsWithinAnInstance();

        const isEnubled = true;
        InstanceRecordView.verifyMoveToButtonState(testData.firstLocationUI, isEnubled);
        InventoryInstance.checkHoldingsTableContent({
          name: testData.firstLocationUI,
          records: [{ barcode: testData.itemBarcode, status: ITEM_STATUS_NAMES.AVAILABLE }],
          columnIndex: 2,
        });
        InventoryInstance.moveItemToAnotherHolding({
          fromHolding: testData.firstLocationUI,
          toHolding: testData.secondLocationUI,
          shouldOpen: false,
          itemMoved: true,
        });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.firstLocationUI,
        });
        InventoryInstance.checkHoldingsTableContent({
          name: testData.secondLocationUI,
          records: [{ barcode: testData.itemBarcode, status: ITEM_STATUS_NAMES.AVAILABLE }],
          columnIndex: 2,
          shouldOpen: true,
        });
      },
    );
  });
});
