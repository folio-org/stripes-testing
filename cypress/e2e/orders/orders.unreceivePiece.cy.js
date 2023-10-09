import NewOrder from '../../support/fragments/orders/newOrder';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TestType from '../../support/dictionary/testTypes';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InteractorsTools from '../../support/utils/interactorsTools';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import DevTeams from '../../support/dictionary/devTeams';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import Parallelization from '../../support/dictionary/parallelization';

describe('orders: Unreceive piece from Order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLine = { ...BasicOrderLine.defaultOrderLine };
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
      orderLine.physical.materialSupplier = response;
      orderLine.eresource.accessProvider = response;
    });
    cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` }).then((location) => {
      orderLine.locations[0].locationId = location.id;
    });
    cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
      orderLine.physical.materialType = materialType.id;
    });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after(() => {
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C10925 Unreceive piece (thunderjet)',
    { tags: [TestType.smoke, DevTeams.thunderjet, Parallelization.nonParallel] },
    () => {
      const barcode = Helper.getRandomBarcode();
      const caption = 'autotestCaption';
      Orders.createOrderWithOrderLineViaApi(order, orderLine).then(({ poNumber }) => {
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', poNumber);
        Orders.selectFromResultsList(poNumber);
        Orders.openOrder();
        InteractorsTools.checkCalloutMessage(
          `The Purchase order - ${poNumber} has been successfully opened`,
        );
        Orders.receiveOrderViaActions();
        // Receive piece
        Receiving.selectPOLInReceive(orderLine.titleOrPackage);
        Receiving.receivePiece(0, caption, barcode);
        Receiving.checkReceivedPiece(0, caption, barcode);
        // Unreceive piece
        Receiving.unreceivePiece();
        Receiving.checkUnreceivedPiece(1, caption);
        // inventory part
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', barcode);
        ItemRecordView.verifyItemStatus('On order');
      });
    },
  );
});
