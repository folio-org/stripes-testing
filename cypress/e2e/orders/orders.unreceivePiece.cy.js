import Helper from '../../support/fragments/finance/financeHelper';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import InteractorsTools from '../../support/utils/interactorsTools';

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
    cy.loginAsAdmin();
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C10925 Unreceive piece using "Actions" button (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'nonParallel'] },
    () => {
      const barcode = Helper.getRandomBarcode();
      const enumeration = 'autotestCaption';
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
        Receiving.receivePiece(0, enumeration, barcode);
        Receiving.checkReceivedPiece(0, enumeration, barcode);
        // Unreceive piece
        Receiving.unreceivePiece();
        Receiving.checkUnreceivedPiece(enumeration);
        // inventory part
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', barcode);
        ItemRecordView.verifyItemStatus('On order');
      });
    },
  );
});
