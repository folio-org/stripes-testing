import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets, Funds } from '../../support/fragments/finance';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import { Invoices, NewInvoice } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {};
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const barcode = FinanceHelp.getRandomBarcode();
  const enumeration = 'autotestCaption';

  before(() => {
    cy.getAdminToken();
    const { fiscalYear, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });
    testData.fiscalYear = fiscalYear;
    testData.fund = fund;

    Organizations.createOrganizationViaApi(organization).then((orgResp) => {
      invoice.accountingCode = organization.erpCode;
      organization.id = orgResp;

      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResp) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((amResp) => {
            cy.getBookMaterialType().then((mtypeResp) => {
              const order = {
                ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
                orderType: 'One-Time',
                approved: true,
                reEncumber: true,
              };
              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                cost: {
                  listUnitPrice: 20.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 20.0,
                },
                fundDistribution: [
                  {
                    code: testData.fund.code,
                    fundId: testData.fund.id,
                    value: 100,
                  },
                ],
                locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: mtypeResp.id,
                  materialSupplier: orgResp,
                  volumes: [],
                },
              };

              Orders.createOrderViaApi(order).then((orderResp) => {
                testData.orderId = orderResp.id;
                testData.orderNumber = orderResp.poNumber;
                orderLine.purchaseOrderId = orderResp.id;

                OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                  testData.orderLine = orderLineResponse;

                  Orders.updateOrderViaApi({
                    ...orderResp,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  }).then(() => {
                    cy.wait(3000).then(() => {
                      Receiving.getPiecesViaApi(orderLineResponse.id).then((pieces) => {
                        Receiving.receivePieceViaApi({
                          poLineId: orderLineResponse.id,
                          pieces: [
                            {
                              id: pieces[0].id,
                              enumeration,
                              barcode,
                            },
                          ],
                        });
                      });
                    });
                  });
                  Invoices.createInvoiceWithInvoiceLineViaApi({
                    vendorId: organization.id,
                    fiscalYearId: testData.fiscalYear.id,
                    poLineId: orderLine.id,
                    fundDistributions: orderLine.fundDistribution,
                    accountingCode: organization.id,
                    releaseEncumbrance: true,
                    exportToAccounting: true,
                  }).then((invoiceResp) => {
                    invoice.id = invoiceResp.id;
                    invoice.vendorInvoiceNo = invoiceResp.vendorInvoiceNo;

                    Invoices.changeInvoiceStatusViaApi({
                      invoice: invoiceResp,
                      status: INVOICE_STATUSES.APPROVED,
                    });
                  });
                });
              });
            });
          });
        },
      );
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiReceivingViewEditDelete.gui,
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
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C375110 Encumbered amount is not changed after deleting received piece when related approved invoice exists (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C375110'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      Orders.receiveOrderViaActions();
      Receiving.selectPOLInReceive(testData.orderLine.titleOrPackage);
      Receiving.selectPieceInReceived(barcode);
      Receiving.openDropDownInEditPieceModal();
      Receiving.deleteItemPiece();
      Receiving.selectPOLineInReceive(`${testData.orderNumber}-1`);
      OrderLines.openPageCurrentEncumbrance('$0.00');
      Funds.verifyDetailsInTransaction(
        testData.fiscalYear.code,
        '$0.00',
        `${testData.orderNumber}-1`,
        'Encumbrance',
        `${testData.fund.name} (${testData.fund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
    },
  );
});
