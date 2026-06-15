import { LOAN_TYPE_NAMES, LOCATION_NAMES, MATERIAL_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C396397_FolioInstance_${randomPostfix}`,
      holdingsLocation: LOCATION_NAMES.ANNEX_UI,
      itemBarcode: generateItemBarcode(),
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
      statisticalCodeUI: 'Book, print (books)',
      statisticalCodeFull: 'ARL (Collection stats):    books - Book, print (books)',
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            testData.instanceTypeId = instanceTypeData[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${testData.holdingsLocation}"` }).then((res) => {
            testData.firstLocationId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            testData.sourceId = folioSource.id;
          });
        })
        .then(() => {
          cy.createInstance({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.firstLocationId,
                sourceId: testData.sourceId,
              },
            ],
            items: [],
          }).then((instanceId) => {
            testData.instanceId = instanceId;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C396397 Verify the inability to save empty statistical code field on Item create/edit page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C396397'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.addItem();
        ItemRecordNew.waitLoading(testData.instanceTitle);
        ItemRecordNew.clickStatisticalCodeButton();
        ItemRecordNew.fillItemRecordFields({
          barcode: testData.itemBarcode,
          materialType: testData.materialType,
          loanType: testData.permanentLoanType,
        });
        ItemRecordNew.save();
        ItemRecordNew.checkErrorMessageForStatisticalCode(true);
        ItemRecordNew.chooseStatisticalCode(testData.statisticalCodeFull);
        ItemRecordNew.checkErrorMessageForStatisticalCode(false);
        ItemRecordNew.deleteStatisticalCodeByName(testData.statisticalCodeUI);
        ItemRecordNew.clickStatisticalCodeButton();
        ItemRecordNew.save();
        ItemRecordNew.checkErrorMessageForStatisticalCode(true);
        ItemRecordNew.chooseStatisticalCode(testData.statisticalCodeFull);
        ItemRecordNew.checkErrorMessageForStatisticalCode(false);
        ItemRecordNew.saveAndClose({ itemSaved: true });
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.openHoldingsAccordion(`${testData.holdingsLocation} >`);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyStatisticalCode(testData.statisticalCodeUI);
        ItemRecordView.closeDetailView();
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.openHoldingsAccordion(`${testData.holdingsLocation} >`);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.openItemEditForm(testData.instanceTitle);
        ItemRecordEdit.deleteStatisticalCodeByName(testData.statisticalCodeUI);
        ItemRecordEdit.clickAddStatisticalCodeButton();
        ItemRecordEdit.saveAndClose();
        ItemRecordEdit.checkErrorMessageForStatisticalCode(true);
        ItemRecordEdit.chooseStatisticalCode(testData.statisticalCodeFull);
        ItemRecordEdit.checkErrorMessageForStatisticalCode(false);
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        ItemRecordView.waitLoading();
        ItemRecordView.verifyStatisticalCode(testData.statisticalCodeUI);
      },
    );
  });
});
