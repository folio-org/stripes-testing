import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Helper from '../../support/fragments/finance/financeHelper';
import Orders from '../../support/fragments/orders/orders';
import InventoryInteractionsDefaults from '../../support/fragments/settings/orders/inventoryInteractionsDefaults';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import InteractorsTools from '../../support/utils/interactorsTools';
import Receiving from '../../support/fragments/receiving/receiving';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../support/fragments/inventory/item/itemRecordEdit';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import ConfirmItemInModal from '../../support/fragments/check-in-actions/confirmItemInModal';
import Users from '../../support/fragments/users/users';
import ItemActions from '../../support/fragments/inventory/inventoryItem/itemActions';
import { ITEM_STATUS_NAMES } from '../../support/constants';

describe('inventory', () => {
  describe('Cataloging', () => {
    let effectiveLocation;
    let orderNumber;
    let materialTypeId;
    const instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
    const itemQuantity = '1';
    const barcode = Helper.getRandomBarcode();
    const caption = 'autotestCaption';
    const firstServicePoint = NewServicePoint.getDefaultServicePoint(
      `autotestServicePoint ${Helper.getRandomBarcode()}`,
    );
    const secondServicePoint = NewServicePoint.getDefaultServicePoint(
      `autotestServicePoint ${Helper.getRandomBarcode()}`,
    );
    let userId;

    before('create test data', () => {
      cy.getAdminToken();
      InventoryInteractionsDefaults.getConfigurationInventoryInteractions({
        query: '(module==ORDERS and configName==approvals)',
      }).then((body) => {
        if (body.configs.length !== 0) {
          const id = body.configs[0].id;

          InventoryInteractionsDefaults.setConfigurationInventoryInteractions({
            id,
            module: 'ORDERS',
            configName: 'approvals',
            enabled: true,
            value: '{"isApprovalRequired":false}',
          });
        }
      });
      InventoryInteractionsDefaults.getConfigurationInventoryInteractions({
        query: '(module==ORDERS and configName==inventory-loanTypeName)',
      }).then((body) => {
        if (body.configs.length !== 0) {
          const id = body.configs[0].id;

          InventoryInteractionsDefaults.setConfigurationInventoryInteractions({
            id,
            module: 'ORDERS',
            configName: 'inventory-loanTypeName',
            enabled: true,
            value: 'Can circulate',
          });
        }
      });
      cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
        materialTypeId = materialType.id;
      });
      ServicePoints.createViaApi(firstServicePoint);
      NewLocation.createViaApi(NewLocation.getDefaultLocation(firstServicePoint.id)).then(
        (location) => {
          effectiveLocation = location;
          Orders.createOrderWithOrderLineViaApi(
            NewOrder.getDefaultOrder(),
            BasicOrderLine.getDefaultOrderLine({
              quantity: itemQuantity,
              title: instanceTitle,
              specialLocationId: effectiveLocation.id,
              specialMaterialTypeId: materialTypeId,
            }),
          ).then((order) => {
            orderNumber = order.poNumber;
          });
        },
      );
      ServicePoints.createViaApi(secondServicePoint);

      cy.createTempUser([
        Permissions.checkinAll.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersEdit.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        UserEdit.addServicePointsViaApi(
          [firstServicePoint.id, secondServicePoint.id],
          userId,
          firstServicePoint.id,
        );
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });

        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.openOrder();
        InteractorsTools.checkCalloutMessage(
          `The Purchase order - ${orderNumber} has been successfully opened`,
        );
        Orders.receiveOrderViaActions();
        Receiving.selectFromResultsList(instanceTitle);
        Receiving.receivePieceWithoutBarcode(0, caption);
        Receiving.checkReceivedPiece(0, caption, 'No value set-');
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
      });
    });

    after('delete test data', () => {
      Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${orderNumber}"` }).then((res) => {
        Orders.deleteOrderViaApi(res[0].id);
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcode);
      UserEdit.changeServicePointPreferenceViaApi(userId, [
        firstServicePoint.id,
        secondServicePoint.id,
      ]).then(() => {
        ServicePoints.deleteViaApi(firstServicePoint.id);
        ServicePoints.deleteViaApi(secondServicePoint.id);
        Users.deleteViaApi(userId);
      });
      NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
        effectiveLocation.institutionId,
        effectiveLocation.campusId,
        effectiveLocation.libraryId,
        effectiveLocation.id,
      );
    });

    it(
      'C3506 Catalog a new title which has been ordered and received in Orders (folijet)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        InventoryInstances.selectInstance();
        InventoryInstances.verifyInstanceDetailsView();
        InventoryInstance.openHoldings(effectiveLocation.name);
        InventoryInstance.verifyItemBarcode('No barcode');
        InventoryInstance.verifyLoan('Can circulate');
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode('-');
        ItemActions.edit();
        ItemRecordEdit.waitLoading(instanceTitle);
        ItemRecordEdit.addBarcode(barcode);
        ItemRecordEdit.save();
        ItemRecordView.checkCalloutMessage();
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode(barcode);

        cy.visit(TopMenu.checkInPath);
        CheckInActions.checkInItem(barcode);
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          instanceTitle,
        );
        // TODO need to wait until result is displayed
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1500);
        InventoryInstances.selectInstance();
        InventoryInstances.verifyInstanceDetailsView();
        InventoryInstance.openHoldings(effectiveLocation.name);
        InventoryInstance.checkHoldingsTable(
          effectiveLocation.name,
          0,
          '-',
          barcode,
          ITEM_STATUS_NAMES.AVAILABLE,
        );
        InventoryInstance.verifyLoan('Can circulate');
        InventoryInstance.openItemByBarcode(barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode(barcode);

        SwitchServicePoint.switchServicePoint(secondServicePoint.name);
        cy.visit(TopMenu.checkInPath);
        CheckInActions.checkInItem(barcode);
        ConfirmItemInModal.confirmInTransitModal();
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          instanceTitle,
        );
        // TODO need to wait until result is displayed
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1500);
        InventoryInstances.selectInstance();
        InventoryInstances.verifyInstanceDetailsView();
        InventoryInstance.openHoldings(effectiveLocation.name);
        InventoryInstance.checkHoldingsTable(effectiveLocation.name, 0, '-', barcode, 'In transit');
        InventoryInstance.verifyLoan('Can circulate');
        InventoryInstance.openItemByBarcode(barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkBarcode(barcode);
      },
    );
  });
});
