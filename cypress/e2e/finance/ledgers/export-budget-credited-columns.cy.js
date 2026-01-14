import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Invoices from '../../../support/fragments/invoices/invoices';
import Users from '../../../support/fragments/users/users';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import getRandomPostfix from '../../../support/utils/stringTools';
import { INVOICE_STATUSES } from '../../../support/constants';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import ExpenseClasses from '../../../support/fragments/settings/finance/expenseClasses';

describe('Finance › Ledgers', () => {
  let user;
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const fundA = { ...Funds.defaultUiFund };
  const budget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
    statusExpenseClasses: [
      { expenseClassId: '', status: 'Active' },
      { expenseClassId: '', status: 'Active' },
    ],
  };
  const expenseClass1 = { ...ExpenseClasses.getDefaultExpenseClass() };
  const expenseClass2 = {
    ...ExpenseClasses.getDefaultExpenseClass(),
    name: `autotest_class_2_name_${getRandomPostfix()}`,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let firstInvoice;
  let secondInvoice;
  let fileName;

  before('Setup data', () => {
    cy.getAdminToken();

    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledger.fiscalYearOneId = fy.id;
      budget.fiscalYearId = fy.id;
      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        fundA.ledgerId = ledgerResponse.id;
        ExpenseClasses.createExpenseClassViaApi(expenseClass1).then((ec1) => {
          expenseClass1.id = ec1.id;
          budget.statusExpenseClasses[0].expenseClassId = ec1.id;
        });
        ExpenseClasses.createExpenseClassViaApi(expenseClass2).then((ec2) => {
          expenseClass2.id = ec2.id;
          budget.statusExpenseClasses[1].expenseClassId = ec2.id;
        });
        Funds.createViaApi(fundA).then((fundResponse) => {
          fundA.id = fundResponse.fund.id;
          budget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(budget);

          Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
            organization.id = responseOrganizations;

            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: organization.id,
              fiscalYearId: fiscalYear.id,
              poLineId: null,
              fundDistributions: [
                {
                  fundId: fundA.id,
                  expenseClassId: expenseClass1.id,
                  value: -20,
                  distributionType: 'amount',
                },
              ],
              accountingCode: organization.erpCode,
              releaseEncumbrance: true,
              subTotal: -20,
            }).then((firstInvoiceResponse) => {
              firstInvoice = firstInvoiceResponse;

              Invoices.changeInvoiceStatusViaApi({
                invoice: firstInvoice,
                status: INVOICE_STATUSES.PAID,
              });
            });

            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: organization.id,
              fiscalYearId: fiscalYear.id,
              poLineId: null,
              fundDistributions: [
                {
                  fundId: fundA.id,
                  expenseClassId: expenseClass2.id,
                  value: -10,
                  distributionType: 'amount',
                },
              ],
              accountingCode: organization.erpCode,
              releaseEncumbrance: true,
              subTotal: -10,
            }).then((secondInvoiceResponse) => {
              secondInvoice = secondInvoiceResponse;

              Invoices.changeInvoiceStatusViaApi({
                invoice: secondInvoice,
                status: INVOICE_STATUSES.PAID,
              });
            });
          });
        });
      });
    });

    fileName = `Export-${ledger.code}-${fiscalYear.code}`;
    cy.createTempUser([
      permissions.uiFinanceExportFinanceRecords.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });
    });
  });

  after('Clean up', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C502956 "Credited" columns are displayed in budget export .csv file (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C502956'] },
    () => {
      Ledgers.searchByName(ledger.name);
      Ledgers.selectLedger(ledger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.prepareExportSettings(fiscalYear.code, 'All', ledger);
      Ledgers.checkColumnNamesInDownloadedLedgerExportFileWithExpClasses(`${fileName}.csv`);
      Ledgers.checkColumnContentInDownloadedLedgerExport(
        `${fileName}.csv`,
        1,
        fundA,
        budget.name,
        '100',
        '100',
        '100',
        '0',
        '0',
        '100',
        '0',
        '100',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '130',
        '130',
      );
      Ledgers.checkColumnContentInDownloadedLedgerExport(
        `${fileName}.csv`,
        2,
        fundA,
        budget.name,
        '100',
        '100',
        '100',
        '0',
        '0',
        '100',
        '0',
        '100',
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        '130',
        '130',
      );

      Ledgers.deleteDownloadedFile(`${fileName}.csv`);
    },
  );
});
