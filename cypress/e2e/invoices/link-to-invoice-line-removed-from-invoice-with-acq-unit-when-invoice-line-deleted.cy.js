import { FUND_DISTRIBUTION_TYPES, INVOICE_STATUSES } from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import { InvoiceLineDetails, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const testData = {};

  before('Create test data', () => {
    const postfix = getRandomPostfix();
    testData.acqUnit = {
      ...AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true }),
      name: `AT_C451630_AcqUnit_${postfix}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C451630_Ledger_${postfix}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C451630_Fund_${postfix}`,
      ledgerId: testData.ledger.id,
    };
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C451630_Organization_${postfix}`,
    };

    cy.getAdminToken();
    // Acquisition unit with all checkboxes checked, admin is assigned to delete the invoice line
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then((acqUnit) => {
      testData.acqUnit = acqUnit;

      cy.getAdminUserDetails().then((adminUser) => {
        AcquisitionUnits.assignUserViaApi(adminUser.id, acqUnit.id).then((membershipId) => {
          testData.adminMembershipId = membershipId;
        });
      });
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
    Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiInvoiceInvoicesAcquisitionsUnitsManage,
          CapabilitySets.uiInvoiceInvoicesAcquisitionsUnitsAssign,
          CapabilitySets.uiInvoiceInvoiceCreate,
          CapabilitySets.acquisitionUnitsSettingsUserAssignmentManage,
        ],
      );
      AcquisitionUnits.assignUserViaApi(testData.user.userId, testData.acqUnit.id).then(
        (membershipId) => {
          testData.userMembershipId = membershipId;
        },
      );
    });

    // Invoice with one invoice line and acquisition unit assigned (created by test user)
    cy.then(() => {
      cy.getUserToken(testData.user.username, testData.user.password);
      Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        accountingCode: testData.organization.erpCode,
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
        acqUnitIds: [testData.acqUnit.id],
      }).then((invoice) => {
        testData.invoice = invoice;
      });
    });

    // Test user is deleted from the acquisition unit
    cy.then(() => {
      cy.getAdminToken();
      AcquisitionUnits.unAssignUserViaApi(testData.userMembershipId);
    });

    // Invoice line is deleted by admin, who is assigned to the acquisition unit
    cy.then(() => {
      InvoiceLineDetails.getInvoiceLinesViaApi({
        query: `invoiceId="${testData.invoice.id}"`,
      }).then(({ totalRecords }) => {
        expect(totalRecords, 'Invoice lines before deletion').to.equal(1);
      });
      InvoiceLineDetails.deleteInvoiceLinesByInvoiceIdViaApi(testData.invoice.id);
    });

    // Test user is added back to the acquisition unit
    cy.then(() => {
      AcquisitionUnits.assignUserViaApi(testData.user.userId, testData.acqUnit.id).then(
        (membershipId) => {
          testData.userMembershipId = membershipId;
        },
      );
    });

    cy.then(() => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Invoices.deleteInvoiceViaApi(testData.invoice.id);
    Budgets.deleteViaApi(testData.budget.id, false);
    Funds.deleteFundViaApi(testData.fund.id, false);
    Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    AcquisitionUnits.unAssignUserViaApi(testData.userMembershipId);
    AcquisitionUnits.unAssignUserViaApi(testData.adminMembershipId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id, false);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C451630 Link to Invoice line is removed from Invoice with Acq unit when Invoice line is deleted (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C451630'] },
    () => {
      // Step 1: Open DevTools ("Network" tab)
      cy.intercept('GET', '**/invoice/invoice-lines?*').as('getInvoiceLines');

      // Step 2: Click on the invoice to open its details
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceLines: [],
      });
      cy.wait('@getInvoiceLines').then(({ response }) => {
        expect(response.body.invoiceLines).to.have.lengthOf(0);
        expect(response.body.totalRecords).to.equal(0);
      });
    },
  );
});
