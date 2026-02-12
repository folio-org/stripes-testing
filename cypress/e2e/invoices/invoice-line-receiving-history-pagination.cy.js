import permissions from '../../support/dictionary/permissions';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Receiving from '../../support/fragments/receiving/receiving';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ORDER_STATUSES } from '../../support/constants';

describe('Invoices', () => {
  const testData = {
    organization: NewOrganization.defaultUiOrganizations,
    order: {},
    orderLine: {},
    invoice: {},
    location: {},
    servicePoint: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(testData.organization).then((organizationResponse) => {
      testData.organization.id = organizationResponse;

      ServicePoints.createViaApi(ServicePoints.getDefaultServicePoint()).then((response) => {
        testData.servicePoint = response.body;

        NewLocation.createViaApi(NewLocation.getDefaultLocation(testData.servicePoint.id)).then(
          (location) => {
            testData.location = location;

            cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
              const materialTypeId = materialType.id;

              cy.getAcquisitionMethodsApi({ query: 'value="Purchase"' }).then(({ body }) => {
                const acquisitionMethodId = body.acquisitionMethods[0].id;

                const order = {
                  ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                  orderType: 'One-Time',
                };

                Orders.createOrderViaApi(order).then((orderResponse) => {
                  testData.order = orderResponse;

                  const orderLine = BasicOrderLine.getDefaultOrderLine({
                    quantity: 100,
                    purchaseOrderId: testData.order.id,
                    specialLocationId: testData.location.id,
                    specialMaterialTypeId: materialTypeId,
                    acquisitionMethod: acquisitionMethodId,
                    checkinItems: false,
                  });

                  OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                    testData.orderLine = orderLineResponse;

                    Orders.updateOrderViaApi({
                      ...testData.order,
                      workflowStatus: ORDER_STATUSES.OPEN,
                    }).then(() => {
                      cy.wait(3000).then(() => {
                        Receiving.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
                          const piecesToReceive = pieces
                            .slice(0, 99)
                            .map((piece) => ({ id: piece.id }));

                          Receiving.receivePieceViaApi({
                            poLineId: testData.orderLine.id,
                            pieces: piecesToReceive,
                          }).then(() => {
                            cy.getBatchGroups().then((batchGroup) => {
                              testData.invoice = {
                                ...NewInvoice.defaultUiInvoice,
                                vendorName: testData.organization.name,
                                accountingCode: testData.organization.erpCode,
                                batchGroup: batchGroup.name,
                              };

                              Invoices.createInvoiceWithInvoiceLineViaApi({
                                vendorId: testData.organization.id,
                                poLineId: testData.orderLine.id,
                                batchGroupId: batchGroup.id,
                                accountingCode: testData.organization.erpCode,
                                subTotal: 100,
                              }).then((invoiceResponse) => {
                                testData.invoice = {
                                  ...testData.invoice,
                                  ...invoiceResponse,
                                };
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          },
        );
      });
    });

    cy.createTempUser([permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C350520 Verify that Invoice receiving history accordion is displaying a pagination list (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350520'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);

      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
      });

      const InvoiceLineDetails = InvoiceView.selectInvoiceLine();

      InvoiceLineDetails.waitLoading();

      InvoiceLineDetails.scrollToBottomOfReceivingHistory();

      InvoiceLineDetails.checkReceivingHistoryTableContent({ startRange: 1, endRange: 50 });
      InvoiceLineDetails.checkReceivingHistoryPaginationButtons({
        nextDisabled: false,
        previousDisabled: true,
      });

      InvoiceLineDetails.clickReceivingHistoryNextButton();
      InvoiceLineDetails.checkReceivingHistoryTableContent({ startRange: 51, endRange: 99 });
      InvoiceLineDetails.checkReceivingHistoryPaginationButtons({
        nextDisabled: true,
        previousDisabled: false,
      });

      InvoiceLineDetails.clickReceivingHistoryPreviousButton();
      InvoiceLineDetails.checkReceivingHistoryTableContent({ startRange: 1, endRange: 50 });
      InvoiceLineDetails.checkReceivingHistoryPaginationButtons({
        nextDisabled: false,
        previousDisabled: true,
      });
    },
  );
});
