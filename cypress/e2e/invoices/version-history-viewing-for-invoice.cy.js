import {
  ADJUSTMENT_DISTRIBUTION_TYPES,
  ADJUSTMENT_PRORATE,
  ADJUSTMENT_RELATION_TO_TOTAL,
  APPLICATION_NAMES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  INVOICE_VIEW_FIELDS,
  ORGANIZATION_SEARCH_OPTIONS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import AcqVersionHistory from '../../support/fragments/acqVersionHistory';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceEditForm, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Approvals from '../../support/fragments/settings/invoices/approvals';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { DateTools } from '../../support/utils';
import { formatDateTime } from '../../support/utils/acquisitions';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { getFullName } from '../../support/utils/users';

describe('Invoices', () => {
  // Invoice version history pane reuses the order line pane id
  const versionHistoryPane = 'order-line';
  const versionView = 'invoice';
  // Versions of each invoice from Preconditions: two edits and the original version
  const versionsCount = 3;
  const originalVersionIndex = versionsCount - 1;
  const lockTotalAmount = '10';
  const exchangeRate = '2';
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.organizations = ['1', '2'].map((index) => ({
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C613165_Organization_${index}_${postfix}`,
    }));
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C613165_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C613165_Fund_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.notes = [`AT_C613165_Note_1_${postfix}`, `AT_C613165_Note_2_${postfix}`];
    testData.adjustmentDescription = `AT_C613165_Adjustment_${postfix}`;

    cy.clearLocalStorage();
    cy.getAdminToken();
    Approvals.setApprovePayValueViaApi(false);
    cy.getTenantLocaleApi().then((locale) => {
      testData.locale = locale;
    });
    cy.getAdminUserDetails().then((adminUser) => {
      testData.adminName = getFullName(adminUser);
    });
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({
        ...Budgets.getDefaultBudget(),
        allocated: 1000,
        fiscalYearId: fiscalYear.id,
        fundId: testData.fund.id,
      }).then((budget) => {
        testData.budget = budget;
      });
    });
    testData.organizations.forEach((organization) => {
      Organizations.createOrganizationViaApi(organization).then((id) => {
        organization.id = id;
      });
    });

    cy.then(() => {
      const [firstOrganization, secondOrganization] = testData.organizations;

      // Invoice #1 in "Open" status without invoice lines, edited two times
      Invoices.createInvoiceViaApi({
        vendorId: firstOrganization.id,
        accountingCode: firstOrganization.erpCode,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.firstInvoice = invoice;

        testData.notes.forEach((note) => {
          Invoices.getInvoiceByIdViaApi(invoice.id).then((invoiceBody) => {
            Invoices.updateInvoiceViaApi({ ...invoiceBody, note });
          });
        });
      });

      // Invoice #2 in "Reviewed" status edited two times, adjustment added during the last edit
      Invoices.createInvoiceViaApi({
        vendorId: secondOrganization.id,
        accountingCode: secondOrganization.erpCode,
        invoiceStatus: INVOICE_STATUSES.REVIEWED,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.secondInvoice = invoice;

        Invoices.getInvoiceByIdViaApi(invoice.id).then((invoiceBody) => {
          Invoices.updateInvoiceViaApi({ ...invoiceBody, note: testData.notes[0] });
        });
        Invoices.getInvoiceByIdViaApi(invoice.id).then((invoiceBody) => {
          Invoices.updateInvoiceViaApi({
            ...invoiceBody,
            adjustments: [
              {
                description: testData.adjustmentDescription,
                value: 5,
                type: ADJUSTMENT_DISTRIBUTION_TYPES.AMOUNT,
                prorate: ADJUSTMENT_PRORATE.NOT_PRORATED,
                relationToTotal: ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
                exportToAccounting: false,
                fundDistributions: [],
              },
            ],
          });
        });
      });

      // Invoice #3 in "Open" status with one invoice line with valid fund distribution
      Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: firstOrganization.id,
        accountingCode: firstOrganization.erpCode,
        invoiceStatus: INVOICE_STATUSES.OPEN,
        fundDistributions: [
          {
            code: testData.fund.code,
            fundId: testData.fund.id,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: 100,
          },
        ],
        subTotal: 10,
        exportToAccounting: false,
      }).then((invoice) => {
        testData.thirdInvoice = invoice;
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;
      // Version history card shows the user as "<last name>, <first name>"
      testData.userName = `${userProperties.personal.lastName}, ${userProperties.personal.firstName}`;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiInvoiceInvoiceEdit,
          CapabilitySets.uiOrganizationsDelete,
          CapabilitySets.uiInvoiceInvoiceApprove,
        ],
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    [testData.firstInvoice, testData.secondInvoice, testData.thirdInvoice].forEach(({ id }) => {
      Invoices.deleteInvoiceViaApi(id, { failOnStatusCode: false });
    });
    // Approved Invoice #3 and Budget, Fund, Ledger with its transactions cannot be deleted
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    testData.organizations.forEach(({ id }) => Organizations.deleteOrganizationViaApi(id));
  });

  it(
    'C613165 "Version history" viewing for Invoice (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C613165'] },
    () => {
      const { firstInvoice, secondInvoice, thirdInvoice } = testData;
      const [firstNote, secondNote] = testData.notes;

      cy.intercept('GET', `/audit-data/acquisition/invoice/${firstInvoice.id}*`).as(
        'versionHistory',
      );

      // Step 1: Navigate to "Invoice #1" details pane
      Invoices.selectInvoiceByNumber(firstInvoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({ title: firstInvoice.vendorInvoiceNo });

      // Step 2: Hover over "Version history" icon
      InvoiceView.checkVersionHistoryButtonTooltip();

      // Step 3: Click "Version history" icon
      InvoiceView.openVersionHistory();
      // only event timestamps are taken from the response, cards content is checked against the edits made in preconditions
      cy.wait('@versionHistory').then(({ response }) => {
        const formatEventDate = ({ eventDate }) => formatDateTime(testData.locale, eventDate);

        testData.eventDates = response.body.invoiceAuditEvents.map(formatEventDate);
      });
      cy.then(() => {
        InvoiceView.checkVersionHistoryModeControls();
        AcqVersionHistory.verifyVersionsCount(versionHistoryPane, versionsCount);
        [
          { isCurrent: true, changedFields: [INVOICE_VIEW_FIELDS.NOTE] },
          { changedFields: [INVOICE_VIEW_FIELDS.NOTE] },
          { isOriginal: true },
        ].forEach((card, index) => {
          AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
            ...card,
            index,
            eventDate: testData.eventDates[index],
            source: testData.adminName,
          });
        });
        AcqVersionHistory.checkHighlightedFieldsInVersionView(versionView, [secondNote]);
      });

      // Step 4: Click "Version history" icon on the last card
      AcqVersionHistory.selectVersionHistoryCard(versionHistoryPane, {
        index: originalVersionIndex,
      });
      AcqVersionHistory.checkVersionHistoryCardIsActive(versionHistoryPane, {
        index: originalVersionIndex,
      });
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: originalVersionIndex,
        isOriginal: true,
        source: testData.adminName,
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(versionView, []);

      // Step 5: Click "View this version" icon on the first card
      AcqVersionHistory.selectVersionHistoryCard(versionHistoryPane, { index: 0 });
      AcqVersionHistory.checkVersionHistoryCardIsActive(versionHistoryPane, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.adminName,
        changedFields: [INVOICE_VIEW_FIELDS.NOTE],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(versionView, [secondNote]);

      // Step 6: Click title link on any card except the first and the last
      AcqVersionHistory.clickVersionHistoryCardTitle(versionHistoryPane, { index: 1 });
      AcqVersionHistory.checkVersionHistoryCardIsActive(versionHistoryPane, { index: 1 });
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: 1,
        source: testData.adminName,
        changedFields: [INVOICE_VIEW_FIELDS.NOTE],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(versionView, [firstNote]);

      // Step 7: Click "X" button on "Version history" pane
      AcqVersionHistory.closeVersionHistory(versionHistoryPane);
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [{ key: INVOICE_VIEW_FIELDS.NOTE, value: secondNote }],
      });

      // Step 8: Click "Version history" icon
      InvoiceView.openVersionHistory();
      InvoiceView.checkVersionHistoryModeControls();
      AcqVersionHistory.verifyVersionsCount(versionHistoryPane, versionsCount);
      cy.then(() => {
        [
          { isCurrent: true, changedFields: [INVOICE_VIEW_FIELDS.NOTE] },
          { changedFields: [INVOICE_VIEW_FIELDS.NOTE] },
          { isOriginal: true },
        ].forEach((card, index) => {
          AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
            ...card,
            index,
            eventDate: testData.eventDates[index],
            source: testData.adminName,
          });
        });
      });

      // Step 9: Click "X" button on "Vendor invoice number" pane
      InvoiceView.closeVersionView();

      // Step 10: Edit Invoice #1 - check "Lock total", fill "Lock total amount", save
      Invoices.selectInvoiceByNumber(firstInvoice.vendorInvoiceNo);
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.fillInvoiceFields({ lockTotalAmount });
      InvoiceEditForm.clickSaveButton();
      InvoiceView.checkVersionHistoryButtonTooltip();

      // Step 11: Click "Version history" icon
      InvoiceView.openVersionHistory();
      AcqVersionHistory.checkVersionHistoryCardIsActive(versionHistoryPane, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: ['Lock total'],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(versionView, [
        `$${lockTotalAmount}.00`,
      ]);

      // Step 12: Click "X" button on "Version history" pane
      AcqVersionHistory.closeVersionHistory(versionHistoryPane);
      InvoiceView.checkInvoiceDetails({ title: firstInvoice.vendorInvoiceNo });

      // Step 13: Go to "Invoice #2" details pane and click "Version history" icon
      Invoices.selectInvoiceByNumber(secondInvoice.vendorInvoiceNo);
      InvoiceView.openVersionHistory();
      InvoiceView.checkVersionHistoryModeControls();
      AcqVersionHistory.verifyVersionsCount(versionHistoryPane, versionsCount);
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: 0,
        isCurrent: true,
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(versionView, [
        testData.adjustmentDescription,
        ADJUSTMENT_PRORATE.NOT_PRORATED,
        ADJUSTMENT_RELATION_TO_TOTAL.IN_ADDITION_TO,
        '$5.00',
      ]);

      // Step 14: Close "Version history" pane, edit Invoice #2 - change currency, set exchange rate, save
      AcqVersionHistory.closeVersionHistory(versionHistoryPane);
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.fillInvoiceFields({ currency: 'Euro (EUR)', exchangeRate });
      InvoiceEditForm.clickSaveButton();

      // Step 15: Click "Version history" icon
      InvoiceView.openVersionHistory();
      AcqVersionHistory.checkVersionHistoryCardIsActive(versionHistoryPane, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: [INVOICE_VIEW_FIELDS.CURRENCY, INVOICE_VIEW_FIELDS.EXCHANGE_RATE],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(versionView, [exchangeRate, 'EUR']);
      AcqVersionHistory.checkFieldsInVersionView(versionView, [
        { key: INVOICE_VIEW_FIELDS.CURRENCY, value: 'EUR' },
        { key: INVOICE_VIEW_FIELDS.EXCHANGE_RATE, value: exchangeRate },
      ]);

      // Step 16: Delete organization #2 from Preconditions in "Organizations" app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
      Organizations.searchByParameters(
        ORGANIZATION_SEARCH_OPTIONS.NAME,
        testData.organizations[1].name,
      );
      Organizations.selectOrganization(testData.organizations[1].name);
      Organizations.deleteOrganization();
      InteractorsTools.checkCalloutMessage(
        `The organization ${testData.organizations[1].name} was successfully deleted`,
      );

      // Step 17: Navigate to "Invoice #2" details pane, click "Version history" icon
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.selectInvoiceByNumber(secondInvoice.vendorInvoiceNo);
      InteractorsTools.checkCalloutErrorMessage('Failed to load invoice data');
      InvoiceView.openVersionHistory();
      AcqVersionHistory.checkFieldsInVersionView(versionView, [
        { key: INVOICE_VIEW_FIELDS.VENDOR_NAME, value: 'Record deleted' },
      ]);

      // Step 18: Close "Version history" pane, approve Invoice #3
      AcqVersionHistory.closeVersionHistory(versionHistoryPane);
      Invoices.selectInvoiceByNumber(thirdInvoice.vendorInvoiceNo);
      InvoiceView.approveInvoice();
      InvoiceView.checkInvoiceDetails({
        invoiceInformation: [
          { key: INVOICE_VIEW_FIELDS.INVOICE_STATUS, value: INVOICE_STATUSES.APPROVED },
        ],
      });

      // Step 19: Click "Version history" icon
      InvoiceView.openVersionHistory();
      AcqVersionHistory.checkVersionHistoryCardIsActive(versionHistoryPane, { index: 0 });
      AcqVersionHistory.assertVersionHistoryCard(versionHistoryPane, {
        index: 0,
        isCurrent: true,
        source: testData.userName,
        changedFields: [
          'Approval date',
          INVOICE_VIEW_FIELDS.APPROVED_BY,
          INVOICE_VIEW_FIELDS.INVOICE_STATUS,
          'Voucher number',
          INVOICE_VIEW_FIELDS.EXCHANGE_RATE,
        ],
      });
      AcqVersionHistory.checkHighlightedFieldsInVersionView(versionView, [
        INVOICE_STATUSES.APPROVED,
        DateTools.getCurrentDate(),
        `${testData.user.personal.lastName}, ${testData.user.personal.firstName} ${testData.user.personal.middleName}`,
      ]);
    },
  );
});
