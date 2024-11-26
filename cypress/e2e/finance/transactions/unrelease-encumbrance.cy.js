import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Finance', () => {
  describe('Transactions', () => {
    const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultFund = { ...Funds.defaultUiFund };

    const defaultOrder = {
      ...NewOrder.defaultOneTimeOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const firstBudget = {
      ...Budgets.getDefaultBudget(),
      allocated: 1000,
    };
    let user;
    let orderNumber;
    let servicePointId;
    let location;
    let firstInvoice;

    before(() => {
      cy.getAdminToken();
      FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
        defaultFiscalYear.id = defaultFiscalYearResponse.id;
        firstBudget.fiscalYearId = defaultFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(defaultFund).then((fundResponse) => {
            defaultFund.id = fundResponse.fund.id;
            firstBudget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(firstBudget);
            ServicePoints.getViaApi().then((servicePoint) => {
              servicePointId = servicePoint[0].id;
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                (res) => {
                  location = res;

                  MaterialTypes.createMaterialTypeViaApi(
                    MaterialTypes.getDefaultMaterialType(),
                  ).then((mtypes) => {
                    cy.getAcquisitionMethodsApi({
                      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                    }).then((params) => {
                      // Prepare 2 Open Orders for Rollover
                      Organizations.createOrganizationViaApi(organization).then(
                        (responseOrganizations) => {
                          organization.id = responseOrganizations;
                          defaultOrder.vendor = organization.id;
                          const firstOrderLine = {
                            ...BasicOrderLine.defaultOrderLine,
                            cost: {
                              listUnitPrice: 100.0,
                              currency: 'USD',
                              discountType: 'percentage',
                              quantityPhysical: 1,
                              poLineEstimatedPrice: 100.0,
                            },
                            fundDistribution: [
                              { code: defaultFund.code, fundId: defaultFund.id, value: 100 },
                            ],
                            locations: [
                              { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                            ],
                            acquisitionMethod: params.body.acquisitionMethods[0].id,
                            physical: {
                              createInventory: 'Instance, Holding, Item',
                              materialType: mtypes.body.id,
                              materialSupplier: responseOrganizations,
                              volumes: [],
                            },
                          };

                          Orders.createOrderViaApi(defaultOrder).then((defaultOrderResponse) => {
                            defaultOrder.id = defaultOrderResponse.id;
                            orderNumber = defaultOrderResponse.poNumber;
                            firstOrderLine.purchaseOrderId = defaultOrderResponse.id;

                            OrderLines.createOrderLineViaApi(firstOrderLine);
                            Orders.updateOrderViaApi({
                              ...defaultOrderResponse,
                              workflowStatus: ORDER_STATUSES.OPEN,
                            });
                            Invoices.createInvoiceWithInvoiceLineViaApi({
                              vendorId: organization.id,
                              fiscalYearId: defaultFiscalYear.id,
                              poLineId: firstOrderLine.id,
                              fundDistributions: firstOrderLine.fundDistribution,
                              accountingCode: organization.erpCode,
                              releaseEncumbrance: true,
                              subTotal: 100,
                            }).then((invoiceRescponse) => {
                              firstInvoice = invoiceRescponse;

                              Invoices.changeInvoiceStatusViaApi({
                                invoice: firstInvoice,
                                status: INVOICE_STATUSES.PAID,
                              });
                            });
                          });
                        },
                      );
                    });
                  });
                },
              );
            });
          });
        });
      });

      cy.createTempUser([
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
        permissions.uiInvoicesCancelInvoices.gui,
        permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C375105 Unrelease encumbrance when cancelling approved invoice related to Ongoing order (thunderjet)',
      { tags: ['criticalPath', 'thunderjet'] },
      () => {
        FinanceHelp.searchByName(defaultFund.name);
        Funds.selectFund(defaultFund.name);
        Funds.selectBudgetDetails();
        Funds.viewTransactions();
        Funds.checkTransactionDetails(
          1,
          defaultFiscalYear.code,
          '($0.00)',
          `${orderNumber}-1`,
          'Encumbrance',
          `${defaultFund.name} (${defaultFund.code})`,
          'Released',
        );
        TopMenuNavigation.navigateToApp('Invoices');
        Invoices.searchByNumber(firstInvoice.vendorInvoiceNo);
        Invoices.selectInvoice(firstInvoice.vendorInvoiceNo);
        Invoices.cancelInvoice();
        TopMenuNavigation.navigateToApp('Finance');
        Funds.closeTransactionDetails();
        Funds.checkTransactionDetails(
          2,
          defaultFiscalYear.code,
          '($100.00)',
          `${orderNumber}-1`,
          'Encumbrance',
          `${defaultFund.name} (${defaultFund.code})`,
          'Unreleased',
        );
        Funds.closeTransactionDetails();
        Funds.checkPaymentInTransactionDetails(
          1,
          defaultFiscalYear.code,
          '($100.00)',
          firstInvoice.vendorInvoiceNo,
          `${defaultFund.name} (${defaultFund.code})`,
          '$100.00',
        );
        Funds.clickInfoInTransactionDetails();
      },
    );
  });
});
