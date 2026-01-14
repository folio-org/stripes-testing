import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../../support/constants';
import permissions from '../../../../support/dictionary/permissions';
import Budgets from '../../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../../support/fragments/invoices/invoices';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { TransactionDetails } from '../../../../support/fragments/finance';

describe('Fiscal Year Rollover', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.get2DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const secondOrder = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();

  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let firstInvoice;
  let user;
  let firstOrderNumber;
  let secondOrderNumber;
  let location;
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 200,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 200,
  };

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

            // Create second Fiscal Year for Rollover
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
                      secondOrder.vendor = organization.id;
                      firstOrder.vendor = organization.id;
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
                      const secondOrderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        id: uuid(),
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
                        firstOrderNumber = firstOrderResponse.poNumber;
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
                          subTotal: 100,
                        }).then((invoiceRescponse) => {
                          firstInvoice = invoiceRescponse;

                          Invoices.changeInvoiceStatusViaApi({
                            invoice: firstInvoice,
                            status: INVOICE_STATUSES.PAID,
                          });
                        });
                      });
                      Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
                        secondOrder.id = secondOrderResponse.id;
                        secondOrderNumber = secondOrderResponse.poNumber;
                        secondOrderLine.purchaseOrderId = secondOrderResponse.id;

                        OrderLines.createOrderLineViaApi(secondOrderLine);
                        Orders.updateOrderViaApi({
                          ...secondOrderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
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
    });

    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewEditFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersCancelPurchaseOrders.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C357580 Budget summary and Encumbrances updated correctly when editing POL with related invoice after rollover of fiscal year (thunderjet) (TaaS)',
    { tags: ['extendedPathFlaky', 'thunderjet', 'C357580'] },
    () => {
      Orders.searchByParameter('PO number', secondOrderNumber);
      Orders.selectFromResultsList(secondOrderNumber);
      Orders.cancelOrder();
      OrderLines.selectPOLInOrder();
      OrderLines.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '$0.00',
        `${secondOrderNumber}-1`,
        'Encumbrance',
        `${firstFund.name} (${firstFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');

      TopMenuNavigation.navigateToApp('Finance');
      FinanceHelp.selectLedgersNavigation();
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInRolloverInfoForAllExpendedEncumbrances(
        secondFiscalYear.code,
        'None',
        'Transfer',
      );
      Ledgers.closeRolloverInfo();
      FinanceHelp.selectFiscalYearsNavigation();
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
      FinanceHelp.selectFundsNavigation();
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.checkFinancialActivityAndOverages('$100.00', '$0.00', '$0.00', '$0.00', '$100.00');
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', firstOrderNumber);
      Orders.selectFromResultsList(firstOrderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.changePhysicalUnitPrice('70');
      OrderLines.deleteFundInPOLwithoutSave();
      OrderLines.addFundToPolInPercentsWithoutSave(secondFund, '100');
      OrderLines.saveOrderLine();
      OrderLines.selectFund(`${secondFund.name}(${secondFund.code})`);
      Funds.selectBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInList('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: secondFiscalYear.code },
          { key: 'Amount', value: '($70.00)' },
          { key: 'Source', value: `${firstOrderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${secondFund.name} (${secondFund.code})` },
          { key: 'Initial encumbrance', value: '$70.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      Funds.closeTransactionApp(secondFund, secondFiscalYear);
      Funds.closeBudgetDetails();
      Funds.closeFundDetails();
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.openTransactions();
      Funds.checkNoTransactionOfType('Encumbrance');
      Funds.checkNoTransactionOfType('Payment');
      Funds.closeTransactionApp(firstFund, secondFiscalYear);
      Funds.closeBudgetDetails();
      Funds.selectPreviousBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInListByIndex('Encumbrance', 1);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: firstFiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${firstOrderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${firstFund.name} (${firstFund.code})` },
          { key: 'Initial encumbrance', value: '$100.00' },
          { key: 'Expended', value: '$100.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
      Funds.closeTransactionDetails();
      Funds.selectTransactionInListByIndex('Encumbrance', 0);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: firstFiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${secondOrderNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${firstFund.name} (${firstFund.code})` },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
    },
  );
});
