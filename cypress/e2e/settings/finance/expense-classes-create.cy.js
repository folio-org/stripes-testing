import NewExpenceClass from '../../../support/fragments/settings/finance/newExpenseClass';
import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import devTeams from '../../../support/dictionary/devTeams';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import { getAdminSourceRecord } from '../../../support/utils/users';

describe('ui-invoices-settings: Batch Group creation', () => {
  const expenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  const newExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  before(() => {
    cy.getAdminToken();
    getAdminSourceRecord();
    cy.loginAsAdmin();
    cy.visit(`${SettingsMenu.expenseClassesPath}`);
  });

  it(
    'C15857: Create edit and delete Expense classes (thunderjet)',
    { tags: [TestType.criticalPath, devTeams.thunderjet] },
    () => {
      SettingsFinance.waitExpenseClassesLoading();
      SettingsFinance.createNewExpenseClass(expenseClass);
      expenseClass.source = Cypress.env('adminSourceRecord');
      SettingsFinance.checkExpenseClass(expenseClass);

      newExpenseClass.name += 'updated';
      newExpenseClass.code += 'updated';

      SettingsFinance.editExpenseClass(newExpenseClass, expenseClass.name);
      newExpenseClass.source = Cypress.env('adminSourceRecord');
      SettingsFinance.checkExpenseClass(newExpenseClass);

      SettingsFinance.deleteExpenseClass(newExpenseClass);
    },
  );
});
