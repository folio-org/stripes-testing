import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C400646_FolioInstance_${randomPostfix}`,
      itemBarcode: `AT_C400646_ItemBarcode_${randomPostfix}`,
      updateDate: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
    };
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C400646_FolioInstance');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          testData.location = location;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getAllMaterialTypes({ limit: 2, query: 'source=folio' }).then(() => {
          const [firstType, secondType] = Cypress.env('materialTypes');
          testData.materialTypeId = firstType.id;
          testData.updatedMaterialTypeName = secondType.name;
        });
      }).then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: testData.instanceTitle,
            instanceTypeId: testData.instanceTypeId,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.location.id,
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
        }).then((createdInstance) => {
          instanceId = createdInstance.instanceId;
        });

        cy.createTempUser([Permissions.uiInventoryViewCreateEditItems.gui]).then(
          (userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          },
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
    });

    it(
      'C400646 Saving record using "Save & keep editing" button when editing an "Item" record (promin)',
      { tags: ['extendedPath', 'promin', 'C400646'] },
      () => {
        // Step 1-2: find the Instance, open its detail view
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: expand Holdings, open the Item by barcode
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);

        // Step 4: Actions > Edit - "Save & keep editing" starts disabled
        ItemRecordView.openItemEditForm(testData.instanceTitle);
        ItemRecordEdit.checkButtonsEnabled({
          saveAndClose: false,
          saveKeepEditing: false,
          cancel: true,
        });

        // Step 5: update Material type - both Save buttons become enabled
        ItemRecordEdit.fillItemRecordFields({ materialType: testData.updatedMaterialTypeName });
        ItemRecordEdit.checkButtonsEnabled({
          saveAndClose: true,
          saveKeepEditing: true,
          cancel: true,
        });

        // Step 6: Save & keep editing - success toast, form stays open and reloaded with the
        // updated value and a fresh "Record last updated" accordion
        ItemRecordEdit.clickSaveAndKeepEditingButton({ itemSaved: true });
        ItemRecordEdit.waitLoading(testData.instanceTitle);

        // Step 7: "Record last updated"/"Source" line reflects this save
        ItemRecordView.verifyLastUpdatedDate(
          testData.updateDate,
          `${testData.user.lastName}, ${testData.user.firstName}`,
        );
      },
    );
  });
});
