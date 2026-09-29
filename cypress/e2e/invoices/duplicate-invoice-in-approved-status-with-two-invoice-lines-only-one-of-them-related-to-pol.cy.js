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
  NO_VALUE,
  ORDER_STATUSES,
  TRANSACTION_DETAIL_FIELDS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  Budgets,
  FiscalYears,
  Funds,
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
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYear: {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `autotest_year_${getRandomPostfix()}`,
        code: `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      ledger: {},
      fund: {},
      acquisitionMethod: {},
      order: {},
      orderLine: {},
      invoice: {},
      invoiceLines: [],
      duplicatedInvoice: {},
      documentFileName: 'file.csv',
      adjustment: {},
      locale: {},
      user: {},
    };

    const createFiscalYear = () => {
      return FiscalYears.createViaApi(testData.fiscalYear).then((fiscalYear) => {
        testData.fiscalYear = fiscalYear;
      });
    };

    const createLedger = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: testData.fiscalYear.id,
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
            fiscalYearId: testData.fiscalYear.id,
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

    const createOrderWithOrderLine = () => {
      return Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      )
        .then((order) => {
          testData.order = order;

          return OrderLines.createOrderLineViaApi(
            BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: order.id,
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
          );
        })
        .then((orderLine) => {
          testData.orderLine = orderLine;
        });
    };

    const openOrder = () => {
      return Orders.updateOrderViaApi({
        ...testData.order,
        workflowStatus: ORDER_STATUSES.OPEN,
      })
        .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
        .then((orderLine) => {
          testData.orderLine = orderLine;
        });
    };

    const createInvoiceWithAdjustment = () => {
      testData.adjustment = {
        description: 'test',
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
      };

      return Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYear.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        exportToAccounting: false,
        adjustments: [testData.adjustment],
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    };

    const createInvoiceLine = ({ poLineId, fundDistributions }) => {
      return Invoices.createInvoiceLineViaApi(
        Invoices.getDefaultInvoiceLine({
          invoiceId: testData.invoice.id,
          invoiceLineStatus: INVOICE_STATUSES.OPEN,
          poLineId,
          fundDistributions,
          accountingCode: testData.organization.erpCode,
          subTotal: 10,
          releaseEncumbrance: false,
        }),
      ).then((invoiceLine) => {
        testData.invoiceLines.push(invoiceLine);
      });
    };

    // Invoice line #1 is related to the PO line and invoice line #2 is not related to any PO line
    const createInvoiceLines = () => {
      return createInvoiceLine({
        poLineId: testData.orderLine.id,
        fundDistributions: testData.orderLine.fundDistribution,
      }).then(() => {
        return createInvoiceLine({
          fundDistributions: [
            {
              code: testData.fund.code,
              fundId: testData.fund.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
        });
      });
    };

    const attachDocumentToInvoice = () => {
      return cy.fixture(testData.documentFileName, 'base64').then((data) => {
        return Invoices.createInvoiceDocumentViaApi({
          invoiceId: testData.invoice.id,
          name: testData.documentFileName,
          data,
        });
      });
    };

    const approveInvoice = () => {
      return Invoices.changeInvoiceStatusViaApi({
        invoice: testData.invoice,
        status: INVOICE_STATUSES.APPROVED,
      });
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

      createFiscalYear()
        .then(createLedger)
        .then(createFundWithBudget)
        .then(createOrganization)
        .then(getAcquisitionMethod)
        .then(createOrderWithOrderLine)
        .then(openOrder)
        .then(createInvoiceWithAdjustment)
        .then(createInvoiceLines)
        .then(attachDocumentToInvoice)
        .then(approveInvoice)
        .then(getTenantLocale)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        if (testData.duplicatedInvoice?.id) {
          Invoices.deleteInvoiceViaApi(testData.duplicatedInvoice.id);
        }
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C514957 Duplicate invoice in "Approved" status with two invoice lines, only one of them related to POL (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C514957'] },
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

        // Steps 2-4: Check the data of the duplicated invoice, its invoice lines and adjustment
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
            { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: INVOICE_VIEW_FIELDS.APPROVED_DATE, value: NO_VALUE },
            { key: INVOICE_VIEW_FIELDS.APPROVED_BY, value: NO_VALUE },
          ],
          invoiceLines: [
            {
              number: 1,
              poNumber: testData.orderLine.poLineNumber,
              description: testData.invoiceLines[0].description,
            },
            { number: 2, description: testData.invoiceLines[1].description },
          ],
          invoiceLevelAdjustments: [
            {
              description: testData.adjustment.description,
              value: `$${testData.adjustment.value}.00`,
              prorate: testData.adjustment.prorate,
              relationToTotal: testData.adjustment.relationToTotal,
            },
          ],
          vendorDetailsInformation: [
            { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
          ],
        });
        // The linked document is not duplicated
        InvoiceView.expandLinksDocumentsAccordion();
        InvoiceView.checkDocumentsSection({ shouldExpand: false, isEmpty: true });
        // The voucher is not duplicated
        InvoiceView.verifyVoucherAccordionAbsent();
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

        // Step 5: Open the duplicated invoice line #1 related to the PO line
        InvoiceView.selectInvoiceLine(0);
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.assertPOLineLink(testData.orderLine.poLineNumber);
        InvoiceLineDetails.checkInvoiceLineDetails({
          invoiceLineInformation: [
            { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.OPEN },
            {
              key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION,
              value: testData.invoiceLines[0].description,
            },
            { key: INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL, value: '$10.00' },
          ],
          checkboxes: [
            {
              locator: { labelText: INVOICE_LINE_VIEW_FIELDS.RELEASE_ENCUMBRANCE },
              conditions: { disabled: true, checked: false },
            },
          ],
        });
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fund.name, amount: '$10.00', currentEncumbrance: '$0.00' },
        ]);

        // Step 6: The encumbrance of the invoice line references the current fiscal year
        InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
          ],
        });

        // Step 7: Open the duplicated invoice line #2 not related to any PO line
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
        InvoiceLineDetails.checkInvoiceLineDetails({
          invoiceLineInformation: [
            { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.OPEN },
            {
              key: INVOICE_LINE_VIEW_FIELDS.DESCRIPTION,
              value: testData.invoiceLines[1].description,
            },
            { key: INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL, value: '$10.00' },
          ],
          checkboxes: [
            {
              locator: { labelText: INVOICE_LINE_VIEW_FIELDS.RELEASE_ENCUMBRANCE },
              conditions: { disabled: true, checked: false },
            },
          ],
        });
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fund.name, amount: '$10.00', currentEncumbrance: '-' },
        ]);
      },
    );
  });
});
