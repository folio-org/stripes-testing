import NewExpenceClass from '../../../support/fragments/settings/finance/newExpenseClass';
import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import devTeams from '../../../support/dictionary/devTeams';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';

describe('ui-invoices-settings: Batch Group creation', () => {
  const expenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  const newExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  before(() => {
    cy.loginAsAdmin({ path:SettingsMenu.expenseClassesPath, waiter: SettingsFinance.waitExpenseClassesLoading });
  });

  it('C15857: Create edit and delete Expense classes (thunderjet)', { tags: [TestType.criticalPath, devTeams.thunderjet] }, () => {
    SettingsFinance.createNewExpenseClass(expenseClass);
    SettingsFinance.checkExpenseClass(expenseClass);

    newExpenseClass.name += 'updated';
    newExpenseClass.code += 'updated';

    SettingsFinance.editExpenseClass(newExpenseClass, expenseClass.name);
    SettingsFinance.checkExpenseClass(newExpenseClass);

    SettingsFinance.deleteExpenseClass(newExpenseClass);
  });
});
