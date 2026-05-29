import { LOAN_TYPE_NAMES, LOCATION_NAMES, MATERIAL_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const testData = {
      instanceTitle: `AT_C400644_Instance_${getRandomPostfix()}`,
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
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
          cy.getLocations({ limit: 1, query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (res) => {
              testData.locationId = res.id;
            },
          );
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
                permanentLocationId: testData.locationId,
              },
            ],
            items: [],
          }).then((instanceIds) => {
            testData.instanceId = instanceIds.instanceId;
          });
        });

      cy.createTempUser([Permissions.uiInventoryViewCreateEditItems.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    // functionality is not implemented yet, so test is skipped for now
    it.skip(
      'C400644 Saving record using "Save & keep editing" button when adding a new "Item" record (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        // Step 1: Find Instance record and click Search
        InventoryInstances.searchByTitle(testData.instanceId);

        // Step 2: Click on "Title" value in second pane
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();

        // Step 3: Click on "Add item" button
        InventoryInstance.addItem();
        ItemRecordNew.waitLoading(testData.instanceTitle);
        ItemRecordNew.checkButtonsEnabled({
          saveAndClose: false,
          saveAndKeep: false,
          cancel: true,
        });

        // Step 4: Fill in required fields
        ItemRecordNew.addMaterialType(testData.materialType);
        ItemRecordNew.addPermanentLoanType(testData.permanentLoanType);
        ItemRecordNew.checkButtonsEnabled({
          saveAndClose: true,
          saveAndKeep: true,
          cancel: true,
        });

        // Step 5: Click on the "Save & keep editing" button
        ItemRecordNew.saveAndKeepEditing({ itemSaved: true });
        ItemRecordNew.waitLoading(testData.instanceTitle);
        ItemRecordNew.verifyMaterialTypeSelected(testData.materialType);
        InventoryInstance.verifyLastUpdatedDate();

        // Step 6: Click on "Record last updated" to verify user info
        InventoryInstance.verifyLastUpdatedUser(
          `${testData.user.lastName}, ${testData.user.firstName}`,
        );

        // Step 7: Close the "Add item" form
        ItemRecordNew.cancel();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings([LOCATION_NAMES.MAIN_LIBRARY_UI]);
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.waitLoading();
        ItemRecordView.verifyMaterialType(testData.materialType);
      },
    );
  });
});
