import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import CreateInvoiceModal from '../../support/fragments/orders/modals/createInvoiceModal';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    orderLine: {},
    user: {},
  };

  before(() => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }).then(({ body }) => {
        const order = NewOrder.getDefaultOrder({ vendorId: organizationId });
        Orders.createOrderViaApi(order).then((orderResponse) => {
          testData.order = orderResponse;

          const orderLine = BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: orderResponse.id,
            acquisitionMethod: body.acquisitionMethods[0].id,
          });
          OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
            testData.orderLine = orderLineResponse;

            Orders.updateOrderViaApi({ ...orderResponse, workflowStatus: ORDER_STATUSES.OPEN });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    OrderLines.deleteOrderLineViaApi(testData.orderLine.id);
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C357020 Cancelling invoice creation from order (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C357020'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.createNewInvoice({ confirm: false });
      CreateInvoiceModal.closeModal();
      OrderDetails.waitLoading();
      OrderDetails.createNewInvoice();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.cancelWithUnsavedChanges();
      OrderDetails.waitLoading();
    },
  );
});
