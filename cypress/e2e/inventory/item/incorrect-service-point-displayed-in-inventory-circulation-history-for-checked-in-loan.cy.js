import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import ConfirmItemInModal from '../../../support/fragments/check-in-actions/confirmItemInModal';
import Checkout from '../../../support/fragments/checkout/checkout';
import FilterItems from '../../../support/fragments/inventory/filterItems';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe(
    'Item',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let user;
      const itemStatus = 'Checked out';
      let todayDate;
      let itemData;
      const holdingsPermanentLocation = LOCATION_NAMES.ONLINE_UI;
      let firstServicePoint;
      let secondServicePoint;
      let testData;

      beforeEach('Create test data and login', () => {
        todayDate = moment(new Date()).format('M/D/YYYY');
        itemData = {
          barcode: uuid(),
          instanceTitle: `autotestInstance ${getRandomPostfix()}`,
        };
        firstServicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
        secondServicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
        testData = [ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode];

        cy.getAdminToken()
          .then(() => {
            ServicePoints.createViaApi(firstServicePoint);
            ServicePoints.createViaApi(secondServicePoint);

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              itemData.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              itemData.holdingTypeId = res[0].id;
            });
            cy.getLocations({ query: `name="${holdingsPermanentLocation}"` }).then((locations) => {
              testData.locationsId = locations.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              itemData.loanTypeId = res[0].id;
            });
            cy.getDefaultMaterialType().then((res) => {
              itemData.materialTypeId = res.id;
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
                  permanentLocationId: testData.locationsId,
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
            }).then((specialInstanceIds) => {
              itemData.testInstanceIds = specialInstanceIds;
            });

            // need to create user for checkout item
            cy.createTempUser([Permissions.checkoutAll.gui]).then((userProperties) => {
              Checkout.checkoutItemViaApi({
                itemBarcode: itemData.barcode,
                userBarcode: userProperties.barcode,
                servicePointId: firstServicePoint.id,
              });
              Users.deleteViaApi(userProperties.userId);
            });
          });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.checkinAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          UserEdit.addServicePointsViaApi(
            [firstServicePoint.id, secondServicePoint.id],
            user.userId,
            firstServicePoint.id,
          );
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken().then(() => {
          UserEdit.changeServicePointPreferenceViaApi(user.userId, [
            firstServicePoint.id,
            secondServicePoint.id,
          ]);
          ServicePoints.deleteViaApi(firstServicePoint.id);
          ServicePoints.deleteViaApi(secondServicePoint.id);
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
        });
      });

      it(
        'C399075 Incorrect service point displayed in Inventory Circulation history for checked in loan (folijet)',
        { tags: ['criticalPath', 'folijet', 'C399075', 'shiftLeft'] },
        () => {
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.switchToItem();
          cy.wait(1000);
          FilterItems.toggleItemStatusAccordion();
          cy.wait(1000);
          FilterItems.toggleStatus(itemStatus);
          InventorySearchAndFilter.resetAll();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
          CheckInActions.waitLoading();
          CheckInActions.checkInItemGui(itemData.barcode);
          ConfirmItemInModal.confirmInTransitModal();
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.byKeywords(itemData.instanceTitle);
          InventoryHoldings.checkIfExpanded(`${holdingsPermanentLocation} >`, true);
          InventoryInstance.openItemByBarcode(itemData.barcode);
          ItemRecordView.waitLoading();
          ItemRecordView.checkItemCirculationHistory(
            todayDate,
            firstServicePoint.name,
            user.username,
          );
          ItemRecordView.closeDetailView();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
          CheckInActions.waitLoading();
          SwitchServicePoint.switchServicePoint(secondServicePoint.name);
          CheckInActions.checkInItemGui(itemData.barcode);
          ConfirmItemInModal.confirmInTransitModal();
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.byKeywords(itemData.instanceTitle);
          InventoryHoldings.checkIfExpanded(`${holdingsPermanentLocation} >`, true);
          InventoryInstance.openItemByBarcode(itemData.barcode);
          ItemRecordView.waitLoading();
          ItemRecordView.checkItemCirculationHistory(
            todayDate,
            secondServicePoint.name,
            user.username,
          );
        },
      );
    },
  );
});
