import NewExpenseClass from '../../../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../../../support/fragments/settings/finance/settingsFinance';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Finance', () => {
  describe('Settings (Finance)', () => {
    const expenseClass = { ...NewExpenseClass.defaultUiBatchGroup };
    const newExpenseClass = { ...NewExpenseClass.defaultUiBatchGroup };

    before(() => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.getAdminSourceRecord().then((adminSourceRecord) => {
        expenseClass.source = adminSourceRecord;
        newExpenseClass.source = adminSourceRecord;
      });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: SettingsMenu.expenseClassesPath,
        waiter: SettingsFinance.waitExpenseClassesLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    it(
      'C15857 Create edit and delete Expense classes (thunderjet)',
      { tags: ['dryRun', 'thunderjet', 'C15857'] },
      () => {
        SettingsFinance.waitExpenseClassesLoading();
        SettingsFinance.createNewExpenseClass(expenseClass);
        SettingsFinance.checkExpenseClass(expenseClass, newExpenseClass.source);

        newExpenseClass.name += 'updated';
        newExpenseClass.code += 'updated';

        SettingsFinance.editExpenseClass(newExpenseClass, expenseClass.name);
        SettingsFinance.checkExpenseClass(newExpenseClass, newExpenseClass.source);
        SettingsFinance.deleteExpenseClass(newExpenseClass);
      },
    );
  });
});
