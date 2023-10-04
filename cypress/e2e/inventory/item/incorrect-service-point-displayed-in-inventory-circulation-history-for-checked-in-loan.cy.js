import uuid from 'uuid';
import moment from 'moment';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import UserEdit from '../../../support/fragments/users/userEdit';
import ConfirmItemInModal from '../../../support/fragments/check-in-actions/confirmItemInModal';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import Users from '../../../support/fragments/users/users';
import FilterItems from '../../../support/fragments/inventory/filterItems';
import SwitchServicePoint from '../../../support/fragments/settings/tenant/servicePoints/switchServicePoint';

describe('inventory', () => {
  describe('Item', () => {
    let user;
    const itemStatus = 'Checked out';
    const todayDate = moment(new Date()).format('M/D/YYYY');
    const itemData = {
      barcode: uuid(),
      instanceTitle: `autotestInstance ${getRandomPostfix()}`,
    };
    const holdingsPermanentLocation = LOCATION_NAMES.ONLINE_UI;
    const firstServicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
    const secondServicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
    const testData = [ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode];

    before('create test data and login', () => {
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
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
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

          cy.getUsers({ limit: 1, query: '"barcode"="" and "active"="true"' }).then((users) => {
            Checkout.checkoutItemViaApi({
              itemBarcode: itemData.barcode,
              userBarcode: users[0].barcode,
              servicePointId: firstServicePoint.id,
            });
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

    after('delete test data', () => {
      UserEdit.changeServicePointPreferenceViaApi(user.userId, [
        firstServicePoint.id,
        secondServicePoint.id,
      ]);
      ServicePoints.deleteViaApi(firstServicePoint.id);
      ServicePoints.deleteViaApi(secondServicePoint.id);
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    });

    it(
      'C399075 Incorrect service point displayed in Inventory Circulation history for checked in loan (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.switchToItem();
        cy.wait(1000);
        FilterItems.toggleItemStatusAccordion();
        FilterItems.toggleStatus(itemStatus);

        cy.visit(TopMenu.checkInPath);
        CheckInActions.waitLoading();
        CheckInActions.checkInItemGui(itemData.barcode);
        ConfirmItemInModal.confirmInTransitModal();
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByTitle(itemData.instanceTitle);
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ONLINE_UI} >`);
        InventoryInstance.openItemByBarcode(itemData.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemCirculationHistory(
          todayDate,
          firstServicePoint.name,
          user.username,
        );

        cy.visit(TopMenu.checkInPath);
        CheckInActions.waitLoading();
        SwitchServicePoint.switchServicePoint(secondServicePoint.name);
        CheckInActions.checkInItemGui(itemData.barcode);
        ConfirmItemInModal.confirmInTransitModal();
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.searchInstanceByTitle(itemData.instanceTitle);
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ONLINE_UI} >`);
        InventoryInstance.openItemByBarcode(itemData.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemCirculationHistory(
          todayDate,
          secondServicePoint.name,
          user.username,
        );
      },
    );
  });
});
