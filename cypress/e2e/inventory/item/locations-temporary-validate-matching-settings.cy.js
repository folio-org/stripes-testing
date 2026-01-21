import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../support/constants';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { Locations } from '../../../support/fragments/settings/tenant';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const itemData = {
      barcode: generateItemBarcode(),
      instanceTitle: `AT_C622_Instance_${getRandomPostfix()}`,
      instances: [
        {
          title: `AT_C622_instance ${getRandomPostfix()}`,
        },
        {
          title: `AT_C622_instance ${getRandomPostfix()}`,
        },
        {
          title: `AT_C622_instance ${getRandomPostfix()}`,
        },
      ],
    };
    let location;
    const service = ServicePoints.getDefaultServicePointWithPickUpLocation();
    const checkInResultsData = [ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode];

    before('Create test data and login', () => {
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
          cy.getDefaultMaterialType().then((res) => {
            itemData.materialTypeId = res.id;
            itemData.materialTypeName = res.name;
            checkInResultsData.push(`${itemData.instanceTitle} (${itemData.materialTypeName})`);
          });
          [...Array(3)].forEach((_, index) => {
            const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
            const defaultLocation = Location.getDefaultLocation(servicePoint.id);
            Location.createViaApi(defaultLocation);
            itemData.instances[index].defaultLocation = defaultLocation;
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
        Location.deleteInstitutionCampusLibraryLocationViaApi(
          itemData.instances[index].defaultLocation.institutionId,
          itemData.instances[index].defaultLocation.campusId,
          itemData.instances[index].defaultLocation.libraryId,
          itemData.instances[index].defaultLocation.id,
        );
      });
    });

    it(
      'C622 Locations --> Temporary Location --> (Validate matching settings) (Folijet)(TaaS)',
      { tags: ['extendedPath', 'folijet', 'C622'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(itemData.instanceTitle);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();

        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.openTemporaryLocation();
        [...Array(3)].forEach((_, index) => {
          HoldingsRecordEdit.verifyTemporaryLocationItemExists(
            itemData.instances[index].defaultLocation.name,
          );
        });

        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.SETTINGS);
        TenantPane.goToTenantTab();
        TenantPane.selectTenant(TENANTS.LOCATIONS);
        Locations.waitLoading();
        [...Array(3)].forEach((_, index) => {
          Locations.selectInstitution(itemData.instances[index].defaultLocation.institutionName);
          Locations.selectCampus(itemData.instances[index].defaultLocation.campusName);
          Locations.selectLibrary(itemData.instances[index].defaultLocation.libraryName);
          Locations.checkResultsTableContent([itemData.instances[index].defaultLocation]);
        });
      },
    );
  });
});
