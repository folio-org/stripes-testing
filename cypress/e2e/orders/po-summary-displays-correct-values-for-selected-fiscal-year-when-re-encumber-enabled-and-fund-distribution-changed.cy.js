import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ENCUMBRANCE_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  LEDGER_ROLLOVER_ORDER_TYPES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
  POLINE_DETAILS_FIELDS,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import {
  Budgets,
  FiscalYears,
  Funds,
  LedgerRollovers,
  Ledgers,
  TransactionDetails,
} from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import { Invoices } from '../../support/fragments/invoices';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  describe('Order lines', () => {
    const code = CodeTools(4);

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYears: {
        first: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_A${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_B${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
        third: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_C${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}03`,
          ...DateTools.getFullFiscalYearStartAndEnd(2),
        },
        fourth: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_D${getRandomPostfix()}`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
      },
      ledgerA: {},
      ledgerB: {},
      fundA: {},
      budgetA: {},
      fundB: {},
      budgetB: {},
      acquisitionMethodId: null,
      order1: {},
      orderLine1: {},
      user: {},
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first')
        .then(() => createFiscalYear('second'))
        .then(() => createFiscalYear('third'));
    };

    const createLedgerA = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        name: `autotest_ledgerA_${getRandomPostfix()}`,
        fiscalYearOneId: testData.fiscalYears.first.id,
      }).then((ledger) => {
        testData.ledgerA = ledger;
      });
    };

    const createFundAWithBudget = () => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        name: `autotest_fundA_${getRandomPostfix()}`,
        code: `autotest_fundA_${getRandomPostfix()}`,
        ledgerId: testData.ledgerA.id,
      }).then((fundResponse) => {
        testData.fundA = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.first.id,
          fundId: testData.fundA.id,
          allocated: 1000,
        }).then((budget) => {
          testData.budgetA = budget;
        });
      });
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethodId = () => {
      if (testData.acquisitionMethodId) return cy.wrap(testData.acquisitionMethodId);

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
          return testData.acquisitionMethodId;
        });
    };

    const createOrder1WithLine = () => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: { isSubscription: false, manualRenewal: false },
        }),
        reEncumber: true,
      })
        .then((order) => {
          testData.order1 = order;
          return getAcquisitionMethodId();
        })
        .then((acquisitionMethodId) => {
          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: acquisitionMethodId,
              purchaseOrderId: testData.order1.id,
              listUnitPrice: 100,
              poLineEstimatedPrice: 100,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
            }),
          );
        })
        .then((orderLine) => {
          testData.orderLine1 = orderLine;

          return Orders.updateOrderViaApi({
            ...testData.order1,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
    };

    const createAndPayInvoiceForOrderLine = ({
      fiscalYear,
      subTotal,
      releaseEncumbrance,
      pay = true,
    }) => {
      // After each rollover its fund distribution references the encumbrance of the new fiscal year
      return OrderLines.getOrderLineByIdViaApi(testData.orderLine1.id)
        .then((orderLine) => {
          testData.orderLine1 = orderLine;

          return Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
            fiscalYearId: fiscalYear.id,
            poLineId: orderLine.id,
            fundDistributions: orderLine.fundDistribution,
            invoiceStatus: INVOICE_STATUSES.OPEN,
            subTotal,
            releaseEncumbrance,
            exportToAccounting: true,
          });
        })
        .then((invoice) => {
          if (pay) {
            return Invoices.changeInvoiceStatusViaApi({
              invoice,
              status: INVOICE_STATUSES.PAID,
            }).then(() => invoice);
          }

          return Invoices.changeInvoiceStatusViaApi({
            invoice,
            status: INVOICE_STATUSES.APPROVED,
          }).then(() => invoice);
        });
    };

    const createAndPayInvoice1 = () => {
      return createAndPayInvoiceForOrderLine({
        fiscalYear: testData.fiscalYears.first,
        subTotal: 20,
        releaseEncumbrance: true,
      }).then((invoice) => {
        testData.invoice1 = invoice;
      });
    };

    const createInvoice2 = () => {
      return createAndPayInvoiceForOrderLine({
        fiscalYear: testData.fiscalYears.first,
        subTotal: 30,
        releaseEncumbrance: true,
        pay: false,
      }).then((invoice) => {
        testData.invoice2 = invoice;
      });
    };

    const createAndPayInvoice3Credit = () => {
      return createAndPayInvoiceForOrderLine({
        fiscalYear: testData.fiscalYears.first,
        subTotal: -10,
        releaseEncumbrance: true,
      }).then((invoice) => {
        testData.invoice3 = invoice;
      });
    };

    const rolloverLedgerA = ({ fromFiscalYear, toFiscalYear, basedOn }) => {
      return LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledgerA,
          fromFiscalYear,
          toFiscalYear,
          needCloseBudgets: false,
          encumbrancesRollover: [{ orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONGOING, basedOn }],
        }),
      );
    };

    const rolloverLedgerAToSecondFiscalYear = () => {
      return rolloverLedgerA({
        fromFiscalYear: testData.fiscalYears.first,
        toFiscalYear: testData.fiscalYears.second,
        basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
      });
    };

    const rolloverLedgerAToThirdFiscalYear = () => {
      return rolloverLedgerA({
        fromFiscalYear: testData.fiscalYears.second,
        toFiscalYear: testData.fiscalYears.third,
        basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.EXPENDED,
      });
    };

    const updateFiscalYearDates = (fiscalYearKey, offset) => {
      const updatedFY = {
        ...testData.fiscalYears[fiscalYearKey],
        ...DateTools.getFullFiscalYearStartAndEnd(offset),
      };

      return FiscalYears.updateFiscalYearViaApi(updatedFY).then(() => {
        testData.fiscalYears[fiscalYearKey] = { ...updatedFY, _version: updatedFY._version + 1 };
      });
    };

    const shiftFiscalYearDatesAfterFirstRollover = () => {
      return updateFiscalYearDates('first', -1)
        .then(() => updateFiscalYearDates('second', 0))
        .then(() => updateFiscalYearDates('third', 1));
    };

    const shiftFiscalYearDatesAfterSecondRollover = () => {
      return updateFiscalYearDates('first', -2)
        .then(() => updateFiscalYearDates('second', -1))
        .then(() => updateFiscalYearDates('third', 0));
    };

    const payInvoice2ForPastFiscalYear = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.invoice2,
        status: INVOICE_STATUSES.PAID,
      });
    };

    const createAndPayInvoice4 = () => {
      return createAndPayInvoiceForOrderLine({
        fiscalYear: testData.fiscalYears.second,
        subTotal: 40,
        releaseEncumbrance: false,
      }).then((invoice) => {
        testData.invoice4 = invoice;
      });
    };

    const createAndPayInvoice5 = () => {
      return createAndPayInvoiceForOrderLine({
        fiscalYear: testData.fiscalYears.second,
        subTotal: 50,
        releaseEncumbrance: false,
      }).then((invoice) => {
        testData.invoice5 = invoice;
      });
    };

    const cancelInvoice5 = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.invoice5,
        status: INVOICE_STATUSES.CANCELLED,
      });
    };

    const createFourthFiscalYearWithLedgerBAndFundB = () => {
      return createFiscalYear('fourth')
        .then(() => Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          name: `autotest_ledgerB_${getRandomPostfix()}`,
          fiscalYearOneId: testData.fiscalYears.fourth.id,
        }))
        .then((ledger) => {
          testData.ledgerB = ledger;

          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            name: `autotest_fundB_${getRandomPostfix()}`,
            code: `autotest_fundB_${getRandomPostfix()}`,
            ledgerId: testData.ledgerB.id,
          });
        })
        .then((fundResponse) => {
          testData.fundB = fundResponse.fund;

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: testData.fiscalYears.fourth.id,
            fundId: testData.fundB.id,
            allocated: 1000,
          });
        })
        .then((budget) => {
          testData.budgetB = budget;
        });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersApprovePurchaseOrders.gui,
          Permissions.uiOrdersUnopenpurchaseorders.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
          Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      createConsecutiveFiscalYears()
        .then(createLedgerA)
        .then(createFundAWithBudget)
        .then(createOrganization)
        .then(createOrder1WithLine)
        .then(createAndPayInvoice1)
        .then(createInvoice2)
        .then(createAndPayInvoice3Credit)
        .then(rolloverLedgerAToSecondFiscalYear)
        .then(shiftFiscalYearDatesAfterFirstRollover)
        .then(payInvoice2ForPastFiscalYear)
        .then(createAndPayInvoice4)
        .then(createAndPayInvoice5)
        .then(rolloverLedgerAToThirdFiscalYear)
        .then(shiftFiscalYearDatesAfterSecondRollover)
        .then(cancelInvoice5)
        .then(createFourthFiscalYearWithLedgerBAndFundB)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C777496 PO summary displays correct values for the selected fiscal year when re-encumber is enabled and a fund distribution is changed (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C777496'] },
      () => {
        // Step 1: Check PO summary for the current FY
        Orders.selectFromResultsList(testData.order1.poNumber);
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.third.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 2: Check options in the FY dropdown
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code, testData.fiscalYears.first.code],
        });

        // Step 3: Check PO summary for the previous FY
        OrderDetails.selectFiscalYear(testData.fiscalYears.second.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$60.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$40.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 4: Check PO summary for the year before last
        OrderDetails.selectFiscalYear(testData.fiscalYears.first.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$10.00' },
          ],
        });

        // Step 5: Open edit PO line page
        OrderDetails.selectPOLInOrder();
        OrderLineDetails.waitLoading();
        OrderLineDetails.openOrderLineEditForm();

        // Step 6: Remove Fund A from PO line
        OrderLineEditForm.deleteFundDistribution({ index: 0 });
        OrderLineEditForm.clickSaveButton();
        OrderLineDetails.waitLoading();
        OrderLineDetails.checkFundDistibutionTableContent([]);

        // Step 7: Check PO summary for the current FY
        OrderLineDetails.backToOrderDetails();
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.third.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 8: Check PO summary for the previous FY
        OrderDetails.selectFiscalYear(testData.fiscalYears.second.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$60.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$40.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 9: Check PO summary for the year before last
        OrderDetails.selectFiscalYear(testData.fiscalYears.first.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$50.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$10.00' },
          ],
        });

        // Step 10: Add Fund B to PO line
        OrderDetails.selectPOLInOrder();
        OrderLineDetails.waitLoading();
        OrderLineDetails.openOrderLineEditForm();
        OrderLineEditForm.clickAddFundDistributionButton();
        OrderLineEditForm.selectFundDistribution(testData.fundB.name, 0);
        OrderLineEditForm.clickSaveButton();
        OrderLineDetails.waitLoading();
        OrderLineDetails.checkFundDistibutionTableContent([{ name: testData.fundB.name }]);

        // Step 11: Check encumbrance transaction for Fund B
        OrderLineDetails.openEncumbrancePane(testData.fundB.name);

        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.fourth.code },
            { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$90.00' },
            { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
            { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fundB.name },
            { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$90.00' },
            { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
            { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.UNRELEASED },
          ],
        });
        TransactionDetails.openSourceInTransactionDetails(testData.orderLine1.poLineNumber);
        OrderLines.viewPO();

        // Step 12: Check PO summary for the updated current FY
        OrderDetails.waitLoading();
        OrderDetails.selectFiscalYear(testData.fiscalYears.fourth.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.fourth.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 13: Check fiscal year dropdown options
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.fourth.code, testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code, testData.fiscalYears.first.code],
        });

        // Step 14: Unopen the order
        cy.wait(4000);
        OrderDetails.unOpenOrder({ confirm: true, submit: true });
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$90.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.fourth.code, testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code, testData.fiscalYears.first.code],
        });

        // Step 15: Update PO line cost
        OrderDetails.selectPOLInOrder();
        OrderLineDetails.waitLoading();
        OrderLineDetails.openOrderLineEditForm();
        OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '200' });
        OrderLineEditForm.clickSaveButton();
        OrderLineDetails.waitLoading();
        OrderLineDetails.checkCostDetailsSection([
          { key: POLINE_DETAILS_FIELDS.PHYSICAL_UNIT_PRICE, value: '$200.00' },
        ]);

        // Step 16: Open order and check updated PO summary
        OrderLineDetails.backToOrderDetails();
        OrderDetails.waitLoading();
        OrderDetails.openOrder({ orderNumber: testData.order1.poNumber });
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.fourth.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$200.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$200.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 17: Check fiscal year dropdown options
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.fourth.code, testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code, testData.fiscalYears.first.code],
        });
      },
    );
  });
});
