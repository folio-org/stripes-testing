import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets, FiscalYears, LedgerRollovers } from '../../support/fragments/finance';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Approvals } from '../../support/fragments/settings/invoices';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../support/utils';

describe('Finance', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: {
      ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }),
      reEncumber: true,
      approved: true,
    },
    ledger: {},
    fundA: {},
    budgetForFundA: {},
    user: {},
    invoice: {},
  };
  const code = CodeTools(4);
  const date = new Date();
  const fiscalYears = {
    first: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}01`,
      periodStart: new Date(), // Feb 4, 2026
      periodEnd: new Date(date.getFullYear(), 11, 31), // Dec 31, 2026
    },
    second: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}02`,
      periodStart: new Date(date.getFullYear() + 1, 0, 1), // Jan 1, 2027
      periodEnd: new Date(date.getFullYear() + 1, 11, 31), // Dec 31, 2027
    },
  };

  before(() => {
    cy.getAdminToken();
    const { ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      fiscalYear: fiscalYears.first,
      budget: { allocated: 100 },
    });
    testData.ledger = ledger;
    testData.fundA = fund;
    testData.budgetForFundA = budget;

    FiscalYears.createViaApi(fiscalYears.second);
    Organizations.createOrganizationViaApi(organization).then((orgResp) => {
      organization.id = orgResp;
      testData.invoice.accountingCode = organization.erpCode;

      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResp) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((amResp) => {
            cy.getBookMaterialType().then((mtypeResp) => {
              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                cost: {
                  listUnitPrice: 15.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 15.0,
                },
                fundDistribution: [
                  {
                    code: testData.fundA.code,
                    fundId: testData.fundA.id,
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

              Orders.createOrderViaApi(testData.order).then((orderResp) => {
                testData.order = orderResp;
                testData.orderNumber = orderResp.poNumber;
                orderLine.purchaseOrderId = orderResp.id;

                OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                  testData.orderLine = orderLineResponse;

                  Orders.updateOrderViaApi({
                    ...orderResp,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });

                  Invoices.createInvoiceWithInvoiceLineViaApi({
                    vendorId: organization.id,
                    fiscalYearId: fiscalYears.first.id,
                    fundDistributions: orderLineResponse.fundDistribution,
                    accountingCode: organization.erpCode,
                    releaseEncumbrance: true,
                    subTotal: 15,
                  }).then((invoiceResponse) => {
                    testData.invoice = invoiceResponse;

                    const rollover = LedgerRollovers.generateLedgerRollover({
                      ledger: testData.ledger,
                      fromFiscalYear: fiscalYears.first,
                      toFiscalYear: fiscalYears.second,
                      // needCloseBudgets: false,
                      budgetsRollover: [
                        {
                          rolloverAllocation: false,
                          rolloverBudgetValue: 'None',
                          addAvailableTo: 'Allocation',
                        },
                      ],
                    });
                    LedgerRollovers.createLedgerRolloverViaApi({
                      ...rollover,
                    });
                    FiscalYears.updateFiscalYearViaApi({
                      ...fiscalYears.first,
                      _version: 1,
                      periodStart: new Date(date.getFullYear() - 1, 0, 1), // Jan 1, 2025
                      periodEnd: new Date(date.getFullYear() - 1, 11, 31), // Dec 31, 2025
                    });
                    FiscalYears.updateFiscalYearViaApi({
                      ...fiscalYears.second,
                      _version: 1,
                      periodStart: new Date(), // Feb 4, 2026
                      periodEnd: fiscalYears.second.periodEnd, // Dec 31, 2027
                    });
                    Invoices.updateInvoiceViaApi({
                      ...testData.invoice,
                      fiscalYearId: fiscalYears.second.id,
                    });
                  });
                });
              });
            });
          });
        },
      );
    });
    Approvals.setApprovePayValueViaApi(false);

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  // may be flaky due to concurrency issues because 'Approve and pay in one click' is set to 'false'
  it(
    'C375959 Meaningful error message appears when trying to approve invoice with related fund having only previous budget (thunderjet) (TaaS)',
    { tags: ['extendedPathFlaky', 'thunderjet', 'C375959'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
      });
      InvoiceView.checkInvoiceLinesTableContent([
        {
          fundCode: testData.fundA.code,
        },
      ]);
      Invoices.canNotApproveInvoice(
        `One or more Fund distributions on this invoice can not be paid, because there is not enough money in [${testData.fundA.code}].`,
      );
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.OPEN }],
      });
    },
  );
});
