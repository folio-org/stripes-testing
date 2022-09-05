import newFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import DateTools from '../../../support/utils/dateTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import NewExpenceClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';

describe('ui-finance: Add budget to fund', () => {
    const expenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
    const fund = { ...newFund.defaultFund };
    let createdLedgerId;
    before(() => {
        cy.getAdminToken();

        cy.visit(`${SettingsMenu.expenseClassesPath}`);
        SettingsFinance.createNewExpenseClass(expenseClass);
        SettingsFinance.checkExpenseClass(expenseClass);

        cy.visit(TopMenu.fiscalYearPath);
        FiscalYears.createDefaultFiscalYear(defaultFiscalYear);
        FiscalYears.checkCreatedFiscalYear(defaultFiscalYear.name);

        Funds.createFundViaUI(fund)
        .then(
          createdLedger => {
            createdLedgerId = createdLedger.id;
            Funds.deleteFundViaActions();
            // should not create fund without mandatory fields
            const testFundName = `autotest_fund_${getRandomPostfix()}`;
            Funds.tryToCreateFundWithoutMandatoryFields(testFundName);
            FinanceHelp.searchByName(testFundName);
            Funds.checkZeroSearchResultsHeader();
          }
        );
    });
    it('C15858 Add expense class to budget (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {

      );
});
