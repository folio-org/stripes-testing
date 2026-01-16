import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import ConfirmItemInModal from '../../../../support/fragments/check-in-actions/confirmItemInModal';
import Helper from '../../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import Orders from '../../../../support/fragments/orders/orders';
import Receiving from '../../../../support/fragments/receiving/receiving';
import OrdersApprovals from '../../../../support/fragments/settings/orders/approvals';
import InventoryInteractions from '../../../../support/fragments/settings/orders/inventoryInteractions';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';
import NewServicePoint from '../../../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe(
    'Cataloging -> Creating new records',
    {
      retries: {
        runMode: 0,
      },
    },
    () => {
      let effectiveLocation;
      let orderNumber;
      let materialTypeId;
      let instanceTitle;
      const itemQuantity = '1';
      const loanType = 'Can circulate';
      let barcode;
      let firstServicePoint;
      let secondServicePoint;
      let userId;

      beforeEach('Create test data and login', () => {
        instanceTitle = `autotestTitle ${Helper.getRandomBarcode()}`;
        barcode = Helper.getRandomBarcode();
        firstServicePoint = NewServicePoint.getDefaultServicePoint(
          `autotestServicePoint ${Helper.getRandomBarcode()}`,
        );
        secondServicePoint = NewServicePoint.getDefaultServicePoint(
          `autotestServicePoint ${Helper.getRandomBarcode()}`,
        );

        cy.getAdminToken();

        OrdersApprovals.getOrderApprovalsSettings().then((settings) => {
          if (settings?.length !== 0) {
            OrdersApprovals.setOrderApprovalsSetting({
              ...settings[0],
              value: JSON.stringify({ isApprovalRequired: false }),
            });
          }
        });

        InventoryInteractions.getLoanTypeSettings().then((settings) => {
          if (settings?.length !== 0) {
            InventoryInteractions.setLoanTypeSetting({
              ...settings[0],
              value: loanType,
            });
          }
        });

        cy.getBookMaterialType().then((materialType) => {
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
          Receiving.receivePieceWithoutBarcode();
          Receiving.checkReceivedPiece(0, 'No value set-');

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken().then(() => {
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
          NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
            effectiveLocation.institutionId,
            effectiveLocation.campusId,
            effectiveLocation.libraryId,
            effectiveLocation.id,
          );
        });
      });

      it(
        'C3506 Catalog a new title which has been ordered and received in Orders (folijet)',
        { tags: ['smoke', 'folijet', 'C3506', 'shiftLeft'] },
        () => {
          InventoryInstances.selectInstance();
          InventoryInstances.verifyInstanceDetailsView();
          InventoryInstance.openHoldings(effectiveLocation.name);
          InventoryInstance.verifyItemBarcode('No barcode');
          InventoryInstance.verifyLoan(loanType);
          InventoryInstance.openItemByBarcode('No barcode');
          ItemRecordView.checkBarcode('No value set-');
          InventoryItems.edit();
          ItemRecordEdit.waitLoading(instanceTitle);
          ItemRecordEdit.addBarcode(barcode);
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          ItemRecordView.waitLoading();
          ItemRecordView.checkBarcode(barcode);
          ItemRecordView.closeDetailView();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
          CheckInActions.checkInItem(barcode);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter(
            'Keyword (title, contributor, identifier, HRID, UUID, barcode)',
            instanceTitle,
          );
          // TODO need to wait until result is displayed
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(1500);
          InventoryInstances.selectInstance();
          InventoryInstances.verifyInstanceDetailsView();
          InventoryInstance.checkHoldingsTable(
            effectiveLocation.name,
            0,
            loanType,
            barcode,
            ITEM_STATUS_NAMES.AVAILABLE,
          );
          InventoryInstance.openItemByBarcode(barcode);
          ItemRecordView.waitLoading();
          ItemRecordView.checkBarcode(barcode);
          ItemRecordView.closeDetailView();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
          SwitchServicePoint.switchServicePoint(secondServicePoint.name);
          CheckInActions.checkInItem(barcode);
          ConfirmItemInModal.confirmInTransitModal();
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.verifyInstanceDetailsView();
          InventoryInstance.checkHoldingsTable(
            effectiveLocation.name,
            0,
            loanType,
            barcode,
            'In transit',
          );
          InventoryInstance.openItemByBarcode(barcode);
          ItemRecordView.waitLoading();
          ItemRecordView.checkBarcode(barcode);
        },
      );
    },
  );
});
