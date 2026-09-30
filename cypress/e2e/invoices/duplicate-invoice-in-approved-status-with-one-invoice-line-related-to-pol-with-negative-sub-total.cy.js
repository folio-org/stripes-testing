import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  DEFAULT_WAIT_TIME,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_LINE_VIEW_FIELDS,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  NO_VALUE,
  ORDER_STATUSES,
} from '../../support/constants';
import { AcquisitionUnits } from '../../support/fragments/settings/acquisitionUnits';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import DuplicateInvoiceModal from '../../support/fragments/invoices/modal/duplicateInvoiceModal';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  describe('Duplicate invoice', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit(),
      fiscalYear: {
        ...FiscalYears.getDefaultFiscalYear(),
        name: `autotest_year_${getRandomPostfix()}`,
        code: `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      ledger: {},
      fundA: {},
      fundB: {},
      acquisitionMethod: {},
      order: {},
      orderLine: {},
      invoice: {},
      duplicatedInvoice: {},
      membershipIds: [],
      locale: {},
      user: {},
    };

    const createAcquisitionUnitWithAdmin = () => {
      return AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit)
        .then((acqUnit) => {
          testData.acqUnit = acqUnit;

          return cy.getAdminUserDetails();
        })
        .then((adminUser) => AcquisitionUnits.assignUserViaApi(adminUser.id, testData.acqUnit.id))
        .then((membershipId) => {
          testData.membershipIds.push(membershipId);
        });
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

    const createFundWithBudget = (fundKey) => {
      return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: testData.ledger.id }).then(
        (fundResponse) => {
          testData[fundKey] = fundResponse.fund;

          return Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: testData.fiscalYear.id,
            fundId: testData[fundKey].id,
            allocated: 100,
          });
        },
      );
    };

    const createFundsWithBudgets = () => {
      return createFundWithBudget('fundA').then(() => createFundWithBudget('fundB'));
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

    // The invoice line is paid from Fund B, while the PO line is encumbered against Fund A
    const createInvoiceWithNegativeLine = () => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
        fiscalYearId: testData.fiscalYear.id,
        poLineId: testData.orderLine.id,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        fundDistributions: [
          {
            code: testData.fundB.code,
            fundId: testData.fundB.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
        subTotal: -10,
        releaseEncumbrance: false,
        exportToAccounting: false,
        acqUnitIds: [testData.acqUnit.id],
      }).then((invoice) => {
        testData.invoice = invoice;
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
          Permissions.assignAcqUnitsToNewInvoice.gui,
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          return AcquisitionUnits.assignUserViaApi(userProperties.userId, testData.acqUnit.id);
        })
        .then((membershipId) => {
          testData.membershipIds.push(membershipId);

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.invoicesPath,
            waiter: Invoices.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();

      createAcquisitionUnitWithAdmin()
        .then(createFiscalYear)
        .then(createLedger)
        .then(createFundsWithBudgets)
        .then(createOrganization)
        .then(getAcquisitionMethod)
        .then(createOrderWithOrderLine)
        .then(openOrder)
        .then(createInvoiceWithNegativeLine)
        .then(approveInvoice)
        .then(getTenantLocale)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        testData.membershipIds.forEach((membershipId) => {
          AcquisitionUnits.unAssignUserViaApi(membershipId);
        });
        AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id, false);
        if (testData.duplicatedInvoice?.id) {
          Invoices.deleteInvoiceViaApi(testData.duplicatedInvoice.id);
        }
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C514960 Duplicate invoice in "Approved" status with one invoice line related to POL with negative sub-total (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C514960'] },
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

        // Step 3: Check the data of the duplicated invoice
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [
            { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.OPEN },
            { key: INVOICE_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
            { key: INVOICE_VIEW_FIELDS.SUB_TOTAL, value: '-$10.00' },
            { key: INVOICE_VIEW_FIELDS.ACQUISITION_UNITS, value: testData.acqUnit.name },
            { key: INVOICE_VIEW_FIELDS.APPROVED_DATE, value: NO_VALUE },
            { key: INVOICE_VIEW_FIELDS.APPROVED_BY, value: NO_VALUE },
          ],
          invoiceLines: [
            { poNumber: testData.orderLine.poLineNumber, fundCode: testData.fundB.code },
          ],
          vendorDetailsInformation: [
            { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: testData.organization.name },
          ],
        });
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

        // Step 4: The fund distribution of the invoice line is duplicated from the invoice line, not from the PO line
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.waitLoading();
        InvoiceLineDetails.assertPOLineLink(testData.orderLine.poLineNumber);
        InvoiceLineDetails.checkInvoiceLineDetails({
          invoiceLineInformation: [
            { key: INVOICE_LINE_VIEW_FIELDS.STATUS, value: INVOICE_STATUSES.OPEN },
            { key: INVOICE_LINE_VIEW_FIELDS.SUB_TOTAL, value: '-$10.00' },
          ],
        });
        InvoiceLineDetails.checkFundDistibutionTableContent([
          { name: testData.fundB.name, currentEncumbrance: '-' },
        ]);
      },
    );
  });
});
