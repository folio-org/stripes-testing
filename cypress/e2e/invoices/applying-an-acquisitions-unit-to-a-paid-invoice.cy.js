import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { INVOICE_STATUSES } from '../../support/constants';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Invoices', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    invoice: {},
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit(),
    user: {},
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        };

        return Funds.createViaApi(fund).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          const budget = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 1000,
          };

          return Budgets.createViaApi(budget).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
  };

  const createInvoice = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      return cy.getBatchGroups().then((batchGroup) => {
        return Invoices.createInvoiceViaApi({
          vendorId: testData.organization.id,
          fiscalYearId: testData.fiscalYear.id,
          batchGroupId: batchGroup.id,
          accountingCode: testData.organization.erpCode,
        }).then((invoiceResponse) => {
          testData.invoice = invoiceResponse;

          const invoiceLine = Invoices.getDefaultInvoiceLine({
            invoiceId: invoiceResponse.id,
            invoiceLineStatus: 'Open',
            fundDistributions: [
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
                distributionType: 'percentage',
                value: 100,
              },
            ],
            subTotal: 100.0,
            accountingCode: testData.organization.erpCode,
          });

          return Invoices.createInvoiceLineViaApi(invoiceLine).then(() => {
            return Invoices.changeInvoiceStatusViaApi({
              invoice: invoiceResponse,
              status: INVOICE_STATUSES.PAID,
            });
          });
        });
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    return AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(
      (acquisitionUnit) => {
        testData.acqUnit = acquisitionUnit;

        return createFinanceData().then(() => {
          return createInvoice().then(() => {
            cy.createTempUser([
              permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
              permissions.uiInvoicesManageAcquisitionUnits.gui,
            ]).then((userProperties) => {
              testData.user = userProperties;

              AcquisitionUnits.assignUserViaApi(userProperties.userId, testData.acqUnit.id).then(
                (membershipId) => {
                  testData.membershipUserId = membershipId;

                  cy.login(testData.user.username, testData.user.password, {
                    path: TopMenu.invoicesPath,
                    waiter: Invoices.waitLoading,
                  });
                },
              );
            });
          });
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      AcquisitionUnits.unAssignUserViaApi(testData.membershipUserId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
    });
  });

  it(
    'C357051 Applying an acquisitions unit to a paid invoice (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C357051'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.PAID }],
      });
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.fillInvoiceFields({ acqUnits: [testData.acqUnit.name] });
      InvoiceEditForm.clickSaveButton();
      InteractorsTools.checkCalloutMessage('Invoice has been saved');
      InvoiceView.checkInvoiceDetails({
        title: testData.invoice.vendorInvoiceNo,
        invoiceInformation: [
          { key: 'Acquisition units', value: testData.acqUnit.name },
          { key: 'Status', value: INVOICE_STATUSES.PAID },
        ],
      });
    },
  );
});
