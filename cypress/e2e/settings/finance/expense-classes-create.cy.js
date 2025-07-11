import NewExpenceClass from '../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('ui-invoices-settings: Batch Group creation', () => {
  const expenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  const newExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  before(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getAdminSourceRecord().then((adminSourceRecord) => {
          expenseClass.source = adminSourceRecord;
          newExpenseClass.source = adminSourceRecord;
        });
      })
      .then(() => {
        cy.loginAsAdmin();
        cy.visit(`${SettingsMenu.expenseClassesPath}`);
      });
  });

  it(
    'C15857 Create edit and delete Expense classes (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      SettingsFinance.waitExpenseClassesLoading();
      SettingsFinance.createNewExpenseClass(expenseClass);
      SettingsFinance.checkExpenseClass(expenseClass, expenseClass.source);

      newExpenseClass.name += 'updated';
      newExpenseClass.code += 'updated';

      SettingsFinance.editExpenseClass(newExpenseClass, expenseClass.name);
      SettingsFinance.checkExpenseClass(newExpenseClass, newExpenseClass.source);

      SettingsFinance.deleteExpenseClass(newExpenseClass);
    },
  );
});
