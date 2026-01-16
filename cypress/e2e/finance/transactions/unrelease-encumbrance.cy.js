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
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { TransactionDetails } from '../../../support/fragments/finance';

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

            cy.getLocations({ limit: 1 }).then((res) => {
              location = res;

              cy.getDefaultMaterialType().then((mtype) => {
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
                        locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                        acquisitionMethod: params.body.acquisitionMethods[0].id,
                        physical: {
                          createInventory: 'Instance, Holding, Item',
                          materialType: mtype.id,
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
                            status: INVOICE_STATUSES.APPROVED,
                          });
                        });
                      });
                    },
                  );
                });
              });
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
      { tags: ['criticalPath', 'thunderjet', 'C375105'] },
      () => {
        FinanceHelp.searchByName(defaultFund.name);
        Funds.selectFund(defaultFund.name);
        Funds.selectBudgetDetails();
        Funds.viewTransactions();
        Funds.selectTransactionInList('Encumbrance');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: defaultFiscalYear.code },
            { key: 'Amount', value: '$0.00' },
            { key: 'Source', value: `${orderNumber}-1` },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: `${defaultFund.name} (${defaultFund.code})` },
            { key: 'Initial encumbrance', value: '$100.00' },
            { key: 'Awaiting payment', value: '$100.00' },
            { key: 'Expended', value: '$0.00' },
            { key: 'Status', value: 'Released' },
          ],
        });
        TopMenuNavigation.navigateToApp('Invoices');
        Invoices.searchByNumber(firstInvoice.vendorInvoiceNo);
        Invoices.selectInvoice(firstInvoice.vendorInvoiceNo);
        Invoices.cancelInvoice();
        TopMenuNavigation.navigateToApp('Finance');
        Funds.closeTransactionDetails();
        Funds.selectTransactionInList('Encumbrance');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: defaultFiscalYear.code },
            { key: 'Amount', value: '($100.00)' },
            { key: 'Source', value: `${orderNumber}-1` },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: `${defaultFund.name} (${defaultFund.code})` },
            { key: 'Initial encumbrance', value: '$100.00' },
            { key: 'Awaiting payment', value: '$0.00' },
            { key: 'Expended', value: '$0.00' },
            { key: 'Status', value: 'Unreleased' },
          ],
        });
        Funds.closeTransactionDetails();
        Funds.selectTransactionInList('Pending payment');
        Funds.varifyDetailsInTransactionFundTo(
          defaultFiscalYear.code,
          '($100.00)',
          firstInvoice.vendorInvoiceNo,
          'Pending payment',
          `${defaultFund.name} (${defaultFund.code})`,
        );
        Funds.clickInfoInTransactionDetails();
      },
    );
  });
});
