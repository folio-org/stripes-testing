import newFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import DateTools from '../../../support/utils/dateTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import NewExpenceClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';

describe('ui-finance: Add budget to fund', () => {
    const expenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
    const newExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
    before(() => {
        cy.getAdminToken();
        cy.visit(`${SettingsMenu.expenseClassesPath}`);
        SettingsFinance.createNewExpenseClass(expenseClass);
        SettingsFinance.checkExpenseClass(expenseClass);
    });
    it('C15858 Add expense class to budget (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {

      );
});
