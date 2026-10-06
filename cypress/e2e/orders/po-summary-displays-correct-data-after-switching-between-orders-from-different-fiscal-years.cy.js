import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
  REQUEST_METHOD,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {
    secondFiscalYear: {
      ...FiscalYears.getDefaultFiscalYear(),
      name: `AT_C1045996_FiscalYear_second_${getRandomPostfix()}`,
    },
    firstLedger: {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C1045996_Ledger_first_${getRandomPostfix()}`,
    },
    secondLedger: {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C1045996_Ledger_second_${getRandomPostfix()}`,
    },
    firstFund: {
      ...Funds.getDefaultFund(),
      name: `AT_C1045996_Fund_first_${getRandomPostfix()}`,
    },
    secondFund: {
      ...Funds.getDefaultFund(),
      name: `AT_C1045996_Fund_second_${getRandomPostfix()}`,
    },
    firstBudget: {
      ...Budgets.getDefaultBudget(),
      name: `AT_C1045996_Budget_first_${getRandomPostfix()}`,
      allocated: 100,
    },
    secondBudget: {
      ...Budgets.getDefaultBudget(),
      name: `AT_C1045996_Budget_second_${getRandomPostfix()}`,
      allocated: 100,
    },
    organization: {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C1045996_Organization_${getRandomPostfix()}`,
    },
  };

  before('Create test data', () => {
    cy.clearLocalStorage();
    cy.getAdminToken();
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((currentFiscalYear) => {
      testData.firstFiscalYear = currentFiscalYear;

      Ledgers.createViaApi({ ...testData.firstLedger, fiscalYearOneId: currentFiscalYear.id });
      Funds.createViaApi({ ...testData.firstFund, ledgerId: testData.firstLedger.id });
      Budgets.createViaApi({
        ...testData.firstBudget,
        fiscalYearId: currentFiscalYear.id,
        fundId: testData.firstFund.id,
      });
    });

    FiscalYears.createViaApi(testData.secondFiscalYear);
    Ledgers.createViaApi({
      ...testData.secondLedger,
      fiscalYearOneId: testData.secondFiscalYear.id,
    });
    Funds.createViaApi({ ...testData.secondFund, ledgerId: testData.secondLedger.id });
    Budgets.createViaApi({
      ...testData.secondBudget,
      fiscalYearId: testData.secondFiscalYear.id,
      fundId: testData.secondFund.id,
    });

    Organizations.createOrganizationViaApi(testData.organization);

    cy.getAcquisitionMethodsApi({
      query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
    }).then(({ body: { acquisitionMethods } }) => {
      Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      }).then((firstOrder) => {
        testData.firstOrder = firstOrder;

        OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            title: `AT_C1045996_OrderLine_first_${getRandomPostfix()}`,
            purchaseOrderId: firstOrder.id,
            acquisitionMethod: acquisitionMethods[0].id,
            listUnitPrice: 10,
            fundDistribution: [
              {
                code: testData.firstFund.code,
                fundId: testData.firstFund.id,
                distributionType: 'percentage',
                value: 100,
              },
            ],
          }),
        );
        Orders.updateOrderViaApi({ ...firstOrder, workflowStatus: ORDER_STATUSES.OPEN });
      });

      Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      }).then((secondOrder) => {
        testData.secondOrder = secondOrder;

        const secondOrderLine = BasicOrderLine.getDefaultOrderLine({
          title: `AT_C1045996_OrderLine_second_${getRandomPostfix()}`,
          purchaseOrderId: secondOrder.id,
          acquisitionMethod: acquisitionMethods[0].id,
          listUnitPrice: 20,
          fundDistribution: [
            {
              code: testData.secondFund.code,
              fundId: testData.secondFund.id,
              distributionType: 'percentage',
              value: 100,
            },
          ],
        });

        OrderLines.createOrderLineViaApi(secondOrderLine);
        Orders.updateOrderViaApi({ ...secondOrder, workflowStatus: ORDER_STATUSES.OPEN });

        [3, -1].forEach((subTotal) => {
          Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            fiscalYearId: testData.secondFiscalYear.id,
            poLineId: secondOrderLine.id,
            fundDistributions: secondOrderLine.fundDistribution,
            accountingCode: testData.organization.erpCode,
            releaseEncumbrance: false,
            subTotal,
          }).then((invoice) => {
            Invoices.changeInvoiceStatusViaApi({ invoice, status: INVOICE_STATUSES.PAID });
          });
        });
      });
    });

    cy.createTempUser([permissions.uiOrdersView.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.selectVendorFilter({ vendorName: testData.organization.name });
      Orders.checkSearchResults(testData.firstOrder.poNumber);
      Orders.checkSearchResults(testData.secondOrder.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.firstOrder.id, false);
    Orders.deleteOrderViaApi(testData.secondOrder.id, false);
    Budgets.deleteViaApi(testData.firstBudget.id, false);
    Funds.deleteFundViaApi(testData.firstFund.id, false);
    Ledgers.deleteLedgerViaApi(testData.firstLedger.id, false);
    Budgets.deleteViaApi(testData.secondBudget.id, false);
    Funds.deleteFundViaApi(testData.secondFund.id, false);
    Ledgers.deleteLedgerViaApi(testData.secondLedger.id, false);
    FiscalYears.deleteFiscalYearViaApi(testData.secondFiscalYear.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1045996 PO summary displays correct data after switching between orders from different FYs (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1045996'] },
    () => {
      // Step 1: Open DevTools, click on the Order #1 number from Preconditions
      cy.intercept(
        REQUEST_METHOD.GET,
        new RegExp(`/orders/composite-orders/${testData.firstOrder.id}\\?.*fiscalYearId=`),
      ).as('getFirstOrder');
      Orders.selectFromResultsList(testData.firstOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.WORKFLOW_STATUS, value: ORDER_STATUSES.OPEN },
          { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.firstFiscalYear.code },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$10.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$10.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });
      cy.wait('@getFirstOrder')
        .its('request.url')
        .should('include', `fiscalYearId=${testData.firstFiscalYear.id}`);

      // Step 2: Click on the Order #2 number from Preconditions
      cy.intercept(
        REQUEST_METHOD.GET,
        new RegExp(`/orders/composite-orders/${testData.secondOrder.id}\\?.*fiscalYearId=`),
      ).as('getSecondOrder');
      Orders.selectFromResultsList(testData.secondOrder.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.WORKFLOW_STATUS, value: ORDER_STATUSES.OPEN },
          { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.secondFiscalYear.code },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$20.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$18.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$3.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$1.00' },
        ],
      });
      cy.wait('@getSecondOrder')
        .its('request.url')
        .should('include', `fiscalYearId=${testData.secondFiscalYear.id}`);
    },
  );
});
