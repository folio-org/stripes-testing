import { ITEM_STATUS_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ConfirmDeleteItemModal from '../../../support/fragments/inventory/modals/confirmDeleteItemModal';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
    const itemData = {
      barcode: generateItemBarcode(),
      instanceTitle: `C715 Instance${getRandomPostfix()}`,
    };
    let defaultLocation;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(servicePoint);
          defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(defaultLocation);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            itemData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            itemData.holdingTypeId = res[0].id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            itemData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            itemData.materialTypeId = res.id;
            itemData.materialTypeName = res.name;
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
                permanentLocationId: defaultLocation.id,
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
        })
        .then(() => {
          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.deleteHoldingRecordViaApi(itemData.testInstanceIds.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(itemData.testInstanceIds.instanceId);

        Location.deleteInstitutionCampusLibraryLocationViaApi(
          defaultLocation.institutionId,
          defaultLocation.campusId,
          defaultLocation.libraryId,
          defaultLocation.id,
        );
        ServicePoints.deleteViaApi(servicePoint.id);
      });
    });

    it(
      'C715 Delete an item without dependencies (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C715', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', itemData.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.clickDeleteButton();
        ConfirmDeleteItemModal.clickDeleteButton();
        InventoryInstance.verifyItemBarcode(itemData.barcode, false);
      },
    );
  });
});
