import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('orders: Receiving and Check-in', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const copyNumber = Helper.getRandomBarcode();
  let orderLineTitle;
  let orderNumber;
  let circ2LocationServicePoint;
  let location;

  before(() => {
    cy.getAdminToken();

    ServicePoints.getCircDesk2ServicePointViaApi().then((servicePoint) => {
      circ2LocationServicePoint = servicePoint;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(circ2LocationServicePoint.id)).then(
        (locationResponse) => {
          location = locationResponse;
          Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
            organization.id = organizationsResponse;
            order.vendor = organizationsResponse;
          });

          cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
          cy.createOrderApi(order).then((response) => {
            orderNumber = response.body.poNumber;
            Orders.searchByParameter('PO number', orderNumber);
            Orders.selectFromResultsList(orderNumber);
            Orders.createPOLineViaActions();
            OrderLines.selectRandomInstanceInTitleLookUP('*', 17);
            OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
              'Purchase',
              locationResponse.name,
              '1',
            );
            OrderLines.backToEditingOrder();
            Orders.openOrder();
            OrderLines.getOrderLineViaApi({
              query: `poLineNumber=="*${orderNumber}*"`,
            }).then((orderLinesResponse) => {
              orderLineTitle = orderLinesResponse[0].titleOrPackage;
            });
          });
        },
      );
    });

    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.uiReceivingViewEditCreate.gui,
      permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  // TODO: Need to find solution to delete all data, because now i cant delete location and user
  it(
    'C374134 Copy number applies to the item when receiving through "Quick receive" option (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C374134'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();
      Receiving.selectPieceByIndexInExpected();
      Receiving.fillInCopyNumberInAddPieceModal(copyNumber);
      Receiving.openDropDownInEditPieceModal();
      Receiving.quickReceivePieceAdd();
      Receiving.selectInstanceInReceive(orderLineTitle);
      InventoryInstance.openHoldingsAccordion(location.name);
      InventoryInstance.openItemByBarcodeAndIndex('No barcode');
      ItemRecordView.verifyEffectiveLocation(location.name);
      ItemRecordView.checkCopyNumber(copyNumber);
    },
  );
});
