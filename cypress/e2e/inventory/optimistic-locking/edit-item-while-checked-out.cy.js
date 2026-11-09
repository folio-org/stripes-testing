import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Optimistic locking', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C350662_FolioInstance_${randomPostfix}`,
      barcode: `AT_C350662_ItemBarcode_${randomPostfix}`,
      callNumber: `AT_C350662_CN_${getRandomLetters(6)}`,
    };
    const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
    let user;
    let patron;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.createViaApi(servicePoint);
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            testData.locationId = res.id;
            testData.locationName = res.name;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [{ permanentLocationId: testData.locationId }],
            items: [
              {
                barcode: testData.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((instanceIds) => {
            testData.instanceId = instanceIds.instanceId;
          });
          cy.createTempUser([Permissions.checkoutAll.gui]).then((patronProps) => {
            patron = patronProps;
          });
        });

      cy.createTempUser([Permissions.uiInventoryViewCreateEditItems.gui]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      // Close any loan created during the test before deleting the item
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.barcode,
        servicePointId: servicePoint.id,
      });
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(patron.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      ServicePoints.deleteViaApi(servicePoint.id);
    });

    it(
      'C350662 Edit an item record while item is checked out (promin)',
      { tags: ['extendedPath', 'promin', 'C350662'] },
      () => {
        // Steps 1-2: open the Available item record in edit mode
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings([testData.locationName]);
        InventoryInstance.openItemByBarcode(testData.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.openItemEditForm(testData.instanceTitle);

        // User A updates a field but has NOT saved yet
        ItemRecordNew.addCallNumber(testData.callNumber);
        ItemRecordNew.checkButtonsEnabled({ saveAndClose: true, saveAndKeep: true });

        // Step 3 (via API): check out the item — changes status to Checked out, increments _version
        cy.then(() => {
          cy.getAdminToken(false);
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.barcode,
            userBarcode: patron.barcode,
            servicePointId: servicePoint.id,
          });
          cy.getToken(user.username, user.password);
        }).then(() => {
          // Step 4: User A clicks Save — record is now stale → optimistic locking conflict
          ItemRecordNew.save();
          InventorySteps.verifyOptimisticLockingBanner();
        });
      },
    );
  });
});
