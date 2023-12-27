import TopMenu from '../../../support/fragments/topMenu';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import settingsMenu from '../../../support/fragments/settingsMenu';
import { Locations } from '../../../support/fragments/settings/tenant';

describe('inventory', () => {
  describe('item', () => {
    const itemData = {
      barcode: generateItemBarcode(),
      instanceTitle: `Instance ${getRandomPostfix()}`,
      instances: [
        {
          title: `instance ${getRandomPostfix()}`,
        },
        {
          title: `instance ${getRandomPostfix()}`,
        },
        {
          title: `instance ${getRandomPostfix()}`,
        },
      ],
    };
    let location;
    const service = ServicePoints.getDefaultServicePointWithPickUpLocation();
    const checkInResultsData = [ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode];

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
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            itemData.materialTypeId = res.id;
            itemData.materialTypeName = res.name;
            checkInResultsData.push(`${itemData.instanceTitle} (${itemData.materialTypeName})`);
          });
          [...Array(3)].forEach((_, index) => {
            const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
            const defaultLocation = Location.getDefaultLocation(servicePoint.id);
            Location.createViaApi(defaultLocation);
            itemData.instances[index].location = defaultLocation;
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
                materialType: { id: itemData.materialTypeId },
              },
            ],
          });
        })
        .then((specialInstanceIds) => {
          itemData.testInstanceIds = specialInstanceIds;
        });

      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ServicePoints.deleteViaApi(service.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
      Location.deleteViaApi(location.id);
      [...Array(3)].forEach((_, index) => {
        Location.deleteViaApiIncludingInstitutionCampusLibrary(
          itemData.instances[index].location.institutionId,
          itemData.instances[index].location.campusId,
          itemData.instances[index].location.libraryId,
          itemData.instances[index].location.id,
        );
      });
    });

    it(
      'C634 - Locations --> Temporary Location --> (Validate matching settings) (Folijet)(TaaS)',
      {
        tags: ['extendedPath', 'folijet'],
      },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(itemData.instanceTitle);
        InventorySearchAndFilter.clickAccordionByName(`Holdings: ${location.name} >`);
        InventoryInstance.verifyItemBarcode(itemData.barcode);
        InventoryInstance.openItemByBarcode(itemData.barcode);
        ItemRecordView.waitLoading();

        ItemRecordView.openItemEditForm(itemData.instanceTitle);
        ItemRecordEdit.waitLoading(itemData.instanceTitle);

        ItemRecordEdit.openTemporaryLocation();
        [...Array(3)].forEach((_, index) => {
          ItemRecordEdit.verifyTemporaryLocationItemExists(itemData.instances[index].location.name);
        });

        cy.visit(settingsMenu.tenantLocationsPath);
        Locations.waitLoading();
        [...Array(3)].forEach((_, index) => {
          Locations.selectInstitution(itemData.instances[index].location.institutionName);
          Locations.selectCampus(itemData.instances[index].location.campusName);
          Locations.selectLibrary(itemData.instances[index].location.libraryName);
          Locations.checkResultsTableContent([itemData.instances[index].location]);
        });
      },
    );
  });
});
