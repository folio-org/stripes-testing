import TopMenu from '../../../support/fragments/topMenu';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import LoanTypesSection from '../../../support/fragments/settings/inventory/items/loanTypes';

describe('Inventory', () => {
  describe('item', () => {
    const itemData = {
      barcode: generateItemBarcode(),
      instanceTitle: `Instance ${getRandomPostfix()}`,
      loanType: [
        {
          title: `loanType_${getRandomPostfix()}`,
        },
        {
          title: `loanType_${getRandomPostfix()}`,
        },
        {
          title: `loanType_${getRandomPostfix()}`,
        },
      ],
    };
    let location;
    const service = ServicePoints.getDefaultServicePointWithPickUpLocation();

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            itemData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            itemData.holdingTypeId = res[0].id;
          });
          ServicePoints.createViaApi(service);
          location = Location.getDefaultLocation(service.id);
          Location.createViaApi(location);
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
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

    after('Delete  test data', () => {
      cy.getAdminToken();
      ServicePoints.deleteViaApi(service.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
      Location.deleteViaApi(location.id);
      [...Array(3)].forEach((_, index) => {
        cy.deleteLoanType(itemData.loanType[index].id);
      });
    });

    it(
      'C632 - Loan Data and Availability (incl. validate Loan type settings) (Folijet)(TaaS)',
      {
        tags: ['extendedPath', 'folijet'],
      },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(itemData.instanceTitle);
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(itemData.barcode);
        ItemRecordView.waitLoading();

        InventoryItems.edit();
        [...Array(3)].forEach((_, index) => {
          ItemRecordEdit.chooseItemPermanentLoanType(itemData.loanType[index].title);
        });

        cy.visit(SettingsMenu.loantypesPath);
        LoanTypesSection.verifyLoanTypesOption();
        LoanTypesSection.waitLoading();
        [...Array(3)].forEach((_, index) => {
          LoanTypesSection.verifyLoanTypeExists(itemData.loanType[index].title);
        });
      },
    );
  });
});
