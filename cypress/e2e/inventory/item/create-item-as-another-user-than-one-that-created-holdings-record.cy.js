import {
  INSTANCE_SOURCE_NAMES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Item', () => {
    let userA;
    let userB;
    let instanceHRID;

    const recordsData = {
      instanceTitle: `autoTestInstanceTitle ${Helper.getRandomBarcode()}`,
      permanentLocationOption: `${LOCATION_NAMES.ONLINE} `,
      permanentLocationValue: LOCATION_NAMES.ONLINE_UI,
      source: INSTANCE_SOURCE_NAMES.FOLIO,
    };
    const itemData = {
      barcode: Helper.getRandomBarcode(),
    };

    before('Create test users and login as second user', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        userA = userProperties;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        userB = userProperties;

        cy.login(userB.username, userB.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken().then(() => {
        if (instanceHRID) {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
            (instance) => {
              InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
            },
          );
        }

        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
      });
    });

    it(
      'C1293 Create an Item as another user than the one that created the Holdings record (folijet)',
      { tags: ['extendedPath', 'folijet', 'C1293'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();
        InventoryNewInstance.fillRequiredValues(recordsData.instanceTitle);
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.getAssignedHRID().then((hrid) => {
          instanceHRID = hrid;
        });
        InventoryInstance.createHoldingsRecord(recordsData.permanentLocationOption);
        InventoryInstance.checkInstanceDetails({
          instanceInformation: [{ key: 'Source', value: recordsData.source }],
        });

        cy.login(userA.username, userA.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.searchInstanceByTitle(recordsData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.clickAddItemByHoldingName({
          holdingName: recordsData.permanentLocationValue,
          instanceTitle: recordsData.instanceTitle,
        });
        ItemRecordNew.waitLoading(recordsData.instanceTitle);
        ItemRecordNew.fillItemRecordFields({
          barcode: itemData.barcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });
        ItemRecordNew.saveAndClose({ itemSaved: true });
        InventoryInstance.checkHoldingsTableContent({
          name: recordsData.permanentLocationValue,
          records: [{ barcode: itemData.barcode, status: ITEM_STATUS_NAMES.AVAILABLE }],
        });
        InventoryInstance.openItemByBarcode(itemData.barcode);
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.AVAILABLE);
      },
    );
  });
});
