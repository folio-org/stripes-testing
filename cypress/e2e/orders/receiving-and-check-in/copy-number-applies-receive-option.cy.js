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

  let orderNumber;
  let circ2LocationServicePoint;
  let location;

  before(() => {
    cy.getAdminToken();

    ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' }).then((servicePoints) => {
      circ2LocationServicePoint = servicePoints[0];
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
            Orders.selectFromResultsList();
            Orders.createPOLineViaActions();
            OrderLines.selectRandomInstanceInTitleLookUP('*', 17);
            OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
              'Purchase',
              locationResponse.institutionId,
              '1',
            );
            OrderLines.backToEditingOrder();
            Orders.openOrder();
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

  //     // TODO: Need to find solution to delete all data, becouse now i cant delete location and user

  it(
    'C374133: Copy number applies to the item when receiving through "Receive" option (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'nonParallel'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();
      Receiving.receivePieceWithOnlyCopyNumber(0, copyNumber);
      Receiving.selectInstanceLinkInReceive();
      InventoryInstance.openHoldingsAccordion(location.name);
      InventoryInstance.openItemByBarcodeAndIndex('No barcode');
      ItemRecordView.verifyEffectiveLocation(location.name);
      ItemRecordView.checkCopyNumber(copyNumber);
    },
  );
});
