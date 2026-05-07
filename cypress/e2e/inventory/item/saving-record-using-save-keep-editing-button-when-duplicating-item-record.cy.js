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
      instanceTitle: `AT_C400645_Instance_${getRandomPostfix()}`,
      originalMaterialType: MATERIAL_TYPE_NAMES.BOOK,
      updatedMaterialType: MATERIAL_TYPE_NAMES.DVD,
      permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
      itemBarcode: `AT_C400645_Item_${getRandomPostfix()}`,
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
          cy.getLoanTypes({ limit: 1, query: `name="${testData.permanentLoanType}"` }).then(
            (res) => {
              testData.loanTypeId = res[0].id;
            },
          );
          cy.getDefaultMaterialType().then((materialType) => {
            testData.materialTypeId = materialType.id;
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
                permanentLocationId: testData.locationId,
              },
            ],
            items: [
              {
                barcode: testData.itemBarcode,
                status: { name: 'Available' },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
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
      'C400645 Saving record using "Save & keep editing" button when duplicating an "Item" record (folijet)',
      { tags: ['criticalPath', 'folijet', 'C400645'] },
      () => {
        // Step 1: Find Instance record and click Search
        InventoryInstances.searchByTitle(testData.instanceId);

        // Step 2: Click on "Title" value in second pane
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();

        // Step 3: Open the item record
        InventoryInstance.openHoldings([LOCATION_NAMES.MAIN_LIBRARY_UI]);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.waitLoading();

        // Step 4: Click on "Actions" → Select "Duplicate"
        ItemRecordView.duplicateItem();
        ItemRecordNew.waitLoading(testData.instanceTitle);
        ItemRecordNew.verifyMaterialTypeSelected(testData.originalMaterialType);
        ItemRecordNew.checkButtonsEnabled({
          saveAndClose: true,
          saveAndKeep: true,
          cancel: true,
        });

        // Step 5: Update value in any field (change "Material type" value)
        ItemRecordNew.addMaterialType(testData.updatedMaterialType);
        ItemRecordNew.verifyMaterialTypeSelected(testData.updatedMaterialType);

        // Step 6: Click on the "Save & keep editing" button
        ItemRecordNew.saveAndKeepEditing({ itemSaved: true });
        ItemRecordNew.waitLoading(testData.instanceTitle);
        ItemRecordNew.verifyMaterialTypeSelected(testData.updatedMaterialType);
        InventoryInstance.verifyLastUpdatedDate();

        // Step 7: Click on "Record last updated" accordion to verify user info
        InventoryInstance.verifyLastUpdatedUser(
          `${testData.user.lastName}, ${testData.user.firstName}`,
        );

        // Step 8: Close the "Add item" form
        ItemRecordNew.cancel();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings([LOCATION_NAMES.MAIN_LIBRARY_UI]);
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.waitLoading();
        ItemRecordView.verifyMaterialType(testData.updatedMaterialType);
      },
    );
  });
});
