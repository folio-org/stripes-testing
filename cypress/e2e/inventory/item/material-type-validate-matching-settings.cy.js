import TopMenu from '../../../support/fragments/topMenu';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import settingsMenu from '../../../support/fragments/settingsMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';

describe('inventory', () => {
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `Instance ${getRandomPostfix()}`,
    materialTypes: [
      {
        title: `materialType ${getRandomPostfix()}`,
      },
      {
        title: `materialType ${getRandomPostfix()}`,
      },
      {
        title: `materialType ${getRandomPostfix()}`,
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
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          itemData.loanTypeId = res[0].id;
        });
        [...Array(3)].forEach((_, index) => {
          const materialType = MaterialTypes.getDefaultMaterialType();
          MaterialTypes.createMaterialTypeViaApi(materialType);
          itemData.materialTypes[index].materialType = materialType;
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
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypes[0].materialType.id },
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
      MaterialTypes.deleteMaterialTypeViaApi(itemData.materialTypes[index].materialType.id);
    });
  });

  it(
    'C628 - Item Data --> Material Type --> (Validate matching settings) (Folijet)(TaaS)',
    {
      tags: ['extendedPath', 'folijet'],
    },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(itemData.instanceTitle);
      InventoryInstance.openHoldingsAccordion(location.name);
      InventoryInstance.openItemByBarcodeAndIndex(itemData.barcode);
      InventoryItems.edit();
      [...Array(3)].forEach((_, index) => {
        ItemRecordView.verifyMaterialType(itemData.materialTypes[index].materialType.name);
      });

      cy.visit(settingsMenu.materialTypePath);
      MaterialTypes.checkAvailableOptions();
      [...Array(3)].forEach((_, index) => {
        MaterialTypes.isPresented(itemData.materialTypes[index].materialType.name);
      });
    },
  );
});
