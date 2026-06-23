import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import LoanTypesSection from '../../../support/fragments/settings/inventory/items/loanTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const itemData = {
      barcode: generateItemBarcode(),
      instanceTitle: `AT_C635_Instance_${getRandomPostfix()}`,
      loanType: [
        {
          title: `AT_C635_loanType_${getRandomPostfix()}`,
        },
        {
          title: `AT_C635_loanType_${getRandomPostfix()}`,
        },
        {
          title: `AT_C635_loanType_${getRandomPostfix()}`,
        },
      ],
    };
    const location = {
      name: LOCATION_NAMES.ANNEX_UI,
      id: null,
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            itemData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            itemData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${location.name}"` }).then((res) => {
            location.id = res.id;
          });
          cy.getDefaultMaterialType().then((res) => {
            itemData.materialTypeId = res.id;
          });
          [...Array(3)].forEach((_, index) => {
            cy.createLoanType({
              name: itemData.loanType[index].title,
            }).then((loanType) => {
              itemData.loanType[index].id = loanType.id;
            });
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: itemData.instanceTypeId,
              title: itemData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: itemData.holdingTypeId,
                permanentLocationId: location.id,
              },
            ],
            items: [
              {
                barcode: itemData.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: itemData.loanType[0].id },
                materialType: { id: itemData.materialTypeId },
              },
            ],
          });
        });

      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
      [...Array(3)].forEach((_, index) => {
        cy.deleteLoanType(itemData.loanType[index].id);
      });
    });

    it(
      'C635 Loan Data and Availability --> Temporary loan type --> (Validate matching settings) (Folijet)(TaaS)',
      { tags: ['extendedPath', 'folijet', 'C635'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(itemData.instanceTitle);
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(itemData.barcode);
        InventoryItems.edit();

        [...Array(3)].forEach((_, index) => {
          ItemRecordEdit.addTemporaryLoanType(itemData.loanType[index].title);
        });

        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.SETTINGS);
        ItemRecordEdit.closeCancelEditingModal();
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.LOAN_TYPES);
        LoanTypesSection.verifyLoanTypesOption();
        LoanTypesSection.waitLoading();
        [...Array(3)].forEach((_, index) => {
          LoanTypesSection.verifyLoanTypeExists(itemData.loanType[index].title);
        });
      },
    );
  });
});
