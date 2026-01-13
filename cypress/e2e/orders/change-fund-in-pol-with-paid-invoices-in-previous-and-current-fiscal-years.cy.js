import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import TopMenu from '../../support/fragments/topMenu';

describe('Orders', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get2DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund_2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
    reEncumber: true,
  };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const secondInvoice = {
    status: 'Open',
    invoiceDate: DateTools.getCurrentDate(),
    vendorName: 'Amazon.com',
    accountingCode: '',
    batchGroup: 'FOLIO',
    invoiceNumber: FinanceHelp.getRandomInvoiceNumber(),
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();

  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;
  let location;
  let orderNumber;
  let firstInvoice;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      secondBudget.fiscalYearId = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);
            FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
              secondFiscalYear.id = secondFiscalYearResponse.id;
            });

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
                      firstOrder.vendor = organization.id;
                      const firstOrderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        cost: {
                          listUnitPrice: 10.0,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 1,
                          poLineEstimatedPrice: 10.0,
                        },
                        fundDistribution: [
                          { code: firstFund.code, fundId: firstFund.id, value: 100 },
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
                      Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                        firstOrder.id = firstOrderResponse.id;
                        orderNumber = firstOrderResponse.poNumber;
                        firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                        OrderLines.createOrderLineViaApi(firstOrderLine);
                        Orders.updateOrderViaApi({
                          ...firstOrderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                        Invoices.createInvoiceWithInvoiceLineViaApi({
                          vendorId: organization.id,
                          fiscalYearId: firstFiscalYear.id,
                          poLineId: firstOrderLine.id,
                          fundDistributions: firstOrderLine.fundDistribution,
                          accountingCode: organization.erpCode,
                          releaseEncumbrance: true,
                          subTotal: 10,
                        }).then((invoiceRescponse) => {
                          firstInvoice = invoiceRescponse;

                          Invoices.changeInvoiceStatusViaApi({
                            invoice: firstInvoice,
                            status: INVOICE_STATUSES.PAID,
                          });
                        });
                        cy.loginAsAdmin({
                          path: TopMenu.ordersPath,
                          waiter: Orders.waitLoading,
                          authRefresh: true,
                        });
                        Orders.searchByParameter('PO number', orderNumber);
                        Orders.selectFromResultsList(orderNumber);
                        OrderLines.selectPOLInOrder(0);
                        OrderLines.editPOLInOrder();
                        OrderLines.changeFundInPOLWithoutSaveInPercents(0, secondFund, '100');
                        OrderLines.saveOrderLine();

                        cy.visit(TopMenu.ledgerPath);
                        FinanceHelp.searchByName(defaultLedger.name);
                        Ledgers.selectLedger(defaultLedger.name);
                        Ledgers.rollover();
                        Ledgers.fillInRolloverForOneTimeOrdersWithAllocation(
                          secondFiscalYear.code,
                          'None',
                          'Transfer',
                        );

                        Ledgers.clickOnFiscalYearTab();
                        FinanceHelp.searchByName(firstFiscalYear.name);
                        FiscalYears.selectFY(firstFiscalYear.name);
                        FiscalYears.editFiscalYearDetails();
                        FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
                          periodStartForFirstFY,
                          periodEndForFirstFY,
                        );
                        FinanceHelp.searchByName(secondFiscalYear.name);
                        FiscalYears.selectFY(secondFiscalYear.name);
                        FiscalYears.editFiscalYearDetails();
                        FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
                          periodStartForSecondFY,
                          periodEndForSecondFY,
                        );
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
        permissions.viewEditCreateInvoiceInvoiceLine.gui,
        permissions.uiInvoicesApproveInvoices.gui,
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiInvoicesPayInvoices.gui,
        permissions.uiOrdersEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
          authRefresh: true,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C404376 Change fund distribution when PO line has related paid invoices in previous and current fiscal years (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C404376'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.openPageCurrentEncumbranceInFund(
        `${secondFund.name}(${secondFund.code})`,
        '$10.00',
      );
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '$10.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');

      TopMenuNavigation.navigateToApp('Orders');
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.editFundInPOL(firstFund, '10', '100');
      OrderLines.backToEditingOrder();
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrderWithoutFY(secondInvoice);
      Invoices.approveInvoice();

      TopMenuNavigation.navigateToApp('Orders');
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.changeFundInPOLWithoutSaveInPercents(0, secondFund, '100');
      OrderLines.saveOrderLine();
      OrderLines.cancelEditingPOL();

      TopMenuNavigation.navigateToApp('Invoices');
      Invoices.searchByNumber(secondInvoice.invoiceNumber);
      Invoices.selectInvoice(secondInvoice.invoiceNumber);
      Invoices.payInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageFundInInvoiceLine(`${firstFund.name}(${firstFund.code})`);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${firstFund.name} (${firstFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');

      TopMenuNavigation.navigateToApp('Orders');
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.editFundInPOL(secondFund, '10', '100');
      OrderLines.openPageCurrentEncumbrance('$0.00');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.closeTransactionApp(secondFund, secondFiscalYear);
      Funds.closeBudgetDetails();
      Funds.closeFundDetails();
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '($10.00)',
        invoice.invoiceNumber,
        'Payment',
        `${firstFund.name} (${firstFund.code})`,
      );
    },
  );
});
