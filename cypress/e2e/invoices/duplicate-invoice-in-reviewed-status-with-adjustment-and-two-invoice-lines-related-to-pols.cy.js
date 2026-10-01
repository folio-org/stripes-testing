import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  APPLICATION_NAMES,
  DEFAULT_WAIT_TIME,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_SEARCH_INDEX_LABELS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  LEDGER_ROLLOVER_BUDGET_VALUE,
  ORDER_STATUSES,
  ROLLOVER_BUDGET_VALUE_AS,
  TRANSACTION_DETAIL_FIELDS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  Budgets,
  FiscalYears,
  Funds,
  LedgerRollovers,
  Ledgers,
  TransactionDetails,
} from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  describe('Duplicate invoice', () => {
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
      },
      ledger: {},
      fund: {},
      acquisitionMethod: {},
      order: {},
      orderLines: [],
      invoice: {},
      invoiceLines: [],
      duplicatedInvoice: {},
      locale: {},
      user: {},
    };

    const getAdjustment = (description) => ({
      description,
      value: 5,
      type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
      prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
      relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
      exportToAccounting: false,
      fundDistributions: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          value: 100,
        },
      ],
    });

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first').then(() => createFiscalYear('second'));
    };

    const createLedger = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: testData.fiscalYears.first.id,
        restrictExpenditures: true,
      }).then((ledger) => {
        testData.ledger = ledger;
      });
    };

    const createFundWithBudget = () => {
      return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: testData.ledger.id }).then(
        (fundResponse) => {
          testData.fund = fundResponse.fund;

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: testData.fiscalYears.first.id,
            fundId: testData.fund.id,
            allocated: 100,
          });
        },
      );
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethod = () => {
      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethod = body.acquisitionMethods[0];
        });
    };

    const createOrderLine = () => {
      return OrderLines.createOrderLineViaApi(
        BasicOrderLine.getDefaultOrderLine({
          purchaseOrderId: testData.order.id,
          acquisitionMethod: testData.acquisitionMethod.id,
          listUnitPrice: 10,
          poLineEstimatedPrice: 10,
          fundDistribution: [
            {
              code: testData.fund.code,
              fundId: testData.fund.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
        }),
      ).then((orderLine) => {
        testData.orderLines.push(orderLine);
      });
    };

    const createOrderWithTwoOrderLines = () => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        reEncumber: true,
      })
        .then((order) => {
          testData.order = order;

          return createOrderLine();
        })
        .then(createOrderLine);
    };

    const openOrder = () => {
      return Orders.updateOrderViaApi({
        ...testData.order,
        workflowStatus: ORDER_STATUSES.OPEN,
      })
        .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLines[0].id))
        .then((orderLine) => {
          testData.orderLines[0] = orderLine;

          return OrderLines.getOrderLineByIdViaApi(testData.orderLines[1].id);
        })
        .then((orderLine) => {
          testData.orderLines[1] = orderLine;
        });
    };

    const createInvoiceWithAdjustment = () => {
      return Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYears.first.id,
        invoiceStatus: INVOICE_STATUSES.REVIEWED,
        exportToAccounting: false,
        adjustments: [getAdjustment('test')],
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    };

    const createInvoiceLine = (orderLine, adjustmentDescription) => {
      return Invoices.createInvoiceLineViaApi({
        ...Invoices.getDefaultInvoiceLine({
          invoiceId: testData.invoice.id,
          invoiceLineStatus: INVOICE_STATUSES.REVIEWED,
          poLineId: orderLine.id,
          fundDistributions: orderLine.fundDistribution,
          accountingCode: testData.organization.erpCode,
          subTotal: 10,
          releaseEncumbrance: false,
        }),
        adjustments: [getAdjustment(adjustmentDescription)],
      }).then((invoiceLine) => {
        testData.invoiceLines.push(invoiceLine);
      });
    };

    const createInvoiceLinesWithAdjustments = () => {
      return createInvoiceLine(testData.orderLines[0], 'test line 1').then(() => {
        return createInvoiceLine(testData.orderLines[1], 'test line 2');
      });
    };

    const rolloverToSecondFiscalYear = () => {
      return LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: testData.fiscalYears.first,
          toFiscalYear: testData.fiscalYears.second,
          budgetsRollover: [
            {
              rolloverAllocation: true,
              rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.NONE,
              addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
            },
          ],
          encumbrancesRollover: [],
        }),
      );
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

    const shiftFiscalYearDates = () => {
      return updateFiscalYearDates('first', -1).then(() => updateFiscalYearDates('second', 0));
    };

    const getTenantLocale = () => {
      return cy.getTenantLocaleApi().then((locale) => {
        testData.locale = locale;
      });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.invoicesPath,
            waiter: Invoices.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      createConsecutiveFiscalYears()
        .then(createLedger)
        .then(createFundWithBudget)
        .then(createOrganization)
        .then(getAcquisitionMethod)
        .then(createOrderWithTwoOrderLines)
        .then(openOrder)
        .then(createInvoiceWithAdjustment)
        .then(createInvoiceLinesWithAdjustments)
        .then(rolloverToSecondFiscalYear)
        .then(shiftFiscalYearDates)
        .then(getTenantLocale)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        if (testData.duplicatedInvoice?.id) {
          Invoices.deleteInvoiceViaApi(testData.duplicatedInvoice.id);
        }
        Invoices.deleteInvoiceViaApi(testData.invoice.id);
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C514958 Duplicate invoice in "Reviewed" status with adjustment and two invoice lines related to POLs (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C514958'] },
      () => {
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        InvoiceView.waitLoading();

        // Step 1: Open the "Duplicate" confirmation modal
        Invoices.selectDuplicateInvoice();

        // Step 2: Duplicate the invoice
        Invoices.interceptPostInvoices();
        DuplicateInvoiceModal.clickDuplicateButton();

        let recordCreatedDate;
        Invoices.waitForInvoicesPostQueryCompleted().then(({ response: { body } }) => {
          const currentDate = new Date();
          recordCreatedDate = new Date(body.metadata.createdDate);
          testData.duplicatedInvoice.id = body.id;
          testData.duplicatedInvoice.folioInvoiceNo = body.folioInvoiceNo;

          // Verify that the created date is close to the current date
          // Allowing for a small difference due to processing time
          // We must check actual time difference because the created date is generated on the server side
          // That's why we cant just check for equality, we need to check that it is close enough to the current date
          expect(recordCreatedDate.getTime()).to.be.closeTo(
            currentDate.getTime(),
            DEFAULT_WAIT_TIME,
          );
        });
        InvoiceView.waitLoading();

        // Steps 3-4: Check the data and the adjustment of the duplicated invoice
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
            { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          ],
          invoiceLines: [
            {
              number: 1,
              poNumber: testData.orderLines[0].poLineNumber,
              description: testData.invoiceLines[0].description,
            },
            {
              number: 2,
              poNumber: testData.orderLines[1].poLineNumber,
              description: testData.invoiceLines[1].description,
            },
          ],
          invoiceLevelAdjustments: [
            {
              description: 'test',
              value: '$5.00',
              prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
              relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
            },
          ],
          vendorDetailsInformation: [
            { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
          ],
        });
        cy.then(() => {
          InvoiceView.toggleMetadataAccordion();
          InvoiceView.verifyMetadataContent({
            created: DateTools.getFormattedDateTimeInTimezoneForMetadata(
              recordCreatedDate,
              testData.locale.timezone,
              testData.locale.locale,
            ),
            createdBy: `${testData.user.personal.lastName}, ${testData.user.personal.firstName}`,
          });
        });

        // Steps 5-6: Open the duplicated invoice line #1, its encumbrance references the current fiscal year
        InvoiceView.selectInvoiceLine(0);
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.assertPOLineLink(testData.orderLines[0].poLineNumber);
        InvoiceLineDetails.checkInvoiceLineDetails({
          invoiceLineInformation: [
            { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.OPEN },
            {
              key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION,
              value: testData.invoiceLines[0].description,
            },
          ],
          adjustments: [
            {
              description: 'test line 1',
              value: '$5.00',
              prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
              relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
            },
          ],
        });
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fund.name, amount: '$15.00', currentEncumbrance: '$0.00' },
        ]);
        InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          ],
        });

        // Steps 7-8: Open the duplicated invoice line #2, its encumbrance references the current fiscal year
        // The original and the duplicated invoices have the same vendor invoice number, so the duplicated one is found by the FOLIO invoice number
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        cy.then(() => {
          Invoices.searchByParameter(
            INVOICE_SEARCH_INDEX_LABELS.FOLIO_INVOICE_NUMBER,
            testData.duplicatedInvoice.folioInvoiceNo,
          );
        });
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        InvoiceView.waitLoading();
        InvoiceView.selectInvoiceLine(1);
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.assertPOLineLink(testData.orderLines[1].poLineNumber);
        InvoiceLineDetails.checkInvoiceLineDetails({
          invoiceLineInformation: [
            { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.OPEN },
            {
              key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION,
              value: testData.invoiceLines[1].description,
            },
          ],
          adjustments: [
            {
              description: 'test line 2',
              value: '$5.00',
              prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
              relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
            },
          ],
        });
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fund.name, amount: '$15.00', currentEncumbrance: '$0.00' },
        ]);
        InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          ],
        });
      },
    );
  });
});
