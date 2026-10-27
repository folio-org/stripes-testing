import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const testData = {
      instanceTitle: `AT_C1464270_FolioInstance_${getRandomPostfix()}`,
      barcodeWithoutRequiredFields: `AT_C1464270_ItemBarcode1_${getRandomPostfix()}`,
      barcodeWithRequiredFields: `AT_C1464270_ItemBarcode2_${getRandomPostfix()}`,
      materialType: 'book',
      permanentLoanType: 'Can circulate',
    };

    let user;
    let instanceId;
    let holdingId;

    before('Create test data', () => {
      cy.getAdminToken();

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          testData.location = location;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
          holdings: [{ permanentLocationId: testData.location.id }],
        }).then(({ instanceId: createdInstanceId, holdingIds }) => {
          instanceId = createdInstanceId;
          holdingId = holdingIds[0].id;
        });

        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;
          cy.assignCapabilitiesToExistingUser(user.userId, [], [CapabilitySets.uiInventory]);

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C1464270 Enter key in textbox on item create form triggers "Save & close" (promin)',
      { tags: ['criticalPath', 'promin', 'C1464270'] },
      () => {
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 1: Add item form opens with Material type/Permanent loan type required
        InventoryInstance.clickAddItemByHoldingId({
          holdingId,
          instanceTitle: testData.instanceTitle,
        });

        // Step 2: fill in Barcode only, cursor stays in the field
        ItemRecordEdit.addBarcode(testData.barcodeWithoutRequiredFields);
        ItemRecordEdit.verifyRequiredFieldsErrorMessages({ materialType: false, loanType: false });

        // Step 3: Enter in Barcode with required fields still empty - does not save, form stays
        // open and shows the required-field errors on Material type/Permanent loan type
        ItemRecordEdit.pressEnterInBarcodeField();
        ItemRecordEdit.verifyBarcode(testData.barcodeWithoutRequiredFields);
        ItemRecordEdit.verifyRequiredFieldsErrorMessages();

        // Step 4: select required fields, update Barcode, cursor stays in the field
        ItemRecordEdit.fillItemRecordFields({
          materialType: testData.materialType,
          loanType: testData.permanentLoanType,
        });
        ItemRecordEdit.addBarcode(testData.barcodeWithRequiredFields);

        // Step 5: Enter in Barcode with all required fields filled - item is saved and closed,
        // the Instance detail view is displayed; expand the Holdings accordion to confirm the
        // new item's barcode is there
        ItemRecordEdit.pressEnterInBarcodeField();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.checkHoldingsTableContent({
          name: testData.location.name,
          records: [{ barcode: testData.barcodeWithRequiredFields }],
        });
      },
    );
  });
});
