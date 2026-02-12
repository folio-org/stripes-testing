import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import { ORDER_STATUSES } from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const pieceData = {
    displaySummary: `autotest_displaySummary_${Date.now()}`,
    copyNumber: `autotest_copyNumber_${Date.now()}`,
    enumeration: `autotest_enumeration_${Date.now()}`,
    chronology: `autotest_chronology_${Date.now()}`,
  };
  const testData = {
    organization: NewOrganization.defaultUiOrganizations,
    order: {},
    user: {},
    invoice: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(testData.organization).then((organizationResponse) => {
      testData.organization.id = organizationResponse;

      ServicePoints.createViaApi(ServicePoints.getDefaultServicePoint()).then((response) => {
        NewLocation.createViaApi(NewLocation.getDefaultLocation(response.body.id)).then(
          (location) => {
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
                    quantity: 1,
                    purchaseOrderId: testData.order.id,
                    specialLocationId: location.id,
                    specialMaterialTypeId: materialTypeId,
                    acquisitionMethod: acquisitionMethodId,
                    checkinItems: false,
                  });

                  OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                    Orders.updateOrderViaApi({
                      ...testData.order,
                      workflowStatus: ORDER_STATUSES.OPEN,
                    }).then(() => {
                      cy.wait(3000).then(() => {
                        Receiving.getPiecesViaApi(orderLineResponse.id).then((pieces) => {
                          Receiving.receivePieceViaApi({
                            poLineId: orderLineResponse.id,
                            pieces: [
                              {
                                id: pieces[0].id,
                                displaySummary: pieceData.displaySummary,
                                copyNumber: pieceData.copyNumber,
                                enumeration: pieceData.enumeration,
                                chronology: pieceData.chronology,
                              },
                            ],
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

    cy.getBatchGroups().then((batchGroup) => {
      testData.invoice = {
        ...NewInvoice.defaultUiInvoice,
        batchGroup: batchGroup.name,
      };
    });

    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiOrdersView.gui,
      permissions.uiReceivingView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C350391 Receiving history is shown on invoice line (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350391'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);

      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrderWithoutFY(testData.invoice);

      const invoiceLineDetails = InvoiceView.selectInvoiceLine();
      invoiceLineDetails.waitLoading();

      InvoiceLineDetails.checkReceivingHistoryTableContent({
        records: [
          {
            displaySummary: pieceData.displaySummary,
            copyNumber: pieceData.copyNumber,
            enumeration: pieceData.enumeration,
            chronology: pieceData.chronology,
          },
        ],
      });

      InvoiceLineDetails.clickReceiptDateLink();

      ReceivingDetails.waitLoading();
      ReceivingDetails.checkTitlePaneIsDisplayed();
      ReceivingDetails.checkReceivedTableContent([
        {
          displaySummary: pieceData.displaySummary,
          copyNumber: pieceData.copyNumber,
          enumeration: pieceData.enumeration,
          chronology: pieceData.chronology,
        },
      ]);
    },
  );
});
