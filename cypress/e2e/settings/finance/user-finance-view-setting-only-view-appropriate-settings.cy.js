import { Permissions } from '../../../support/dictionary';
import ExpenseClasses from '../../../support/fragments/settings/finance/expenseClasses';
import FundTypes from '../../../support/fragments/settings/finance/fundTypes';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Fund type view', () => {
  let user;
  const newFundTypes = { ...FundTypes.getDefaultFundTypes() };
  const newExpenseClass = { ...ExpenseClasses.getDefaultExpenseClass() };

  before('Preconditions', () => {
    cy.getAdminToken();
    ExpenseClasses.createExpenseClassViaApi(newExpenseClass);
    FundTypes.createFundTypesViaApi(newFundTypes);
    cy.getAdminSourceRecord().then((adminSourceRecord) => {
      newExpenseClass.source = adminSourceRecord;
    });

    cy.createTempUser([Permissions.uiSettingsFinanceView.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: SettingsMenu.fundTypesPath,
        waiter: SettingsFinance.waitFundTypesLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(user.userId);
      ExpenseClasses.deleteExpenseClassViaApi(newExpenseClass.id);
      FundTypes.deleteFundTypesViaApi(newFundTypes.id);
    });
  });

  it(
    'C409416 A user with "Settings (Finance): View settings" permission can only view appropriate settings (Thunderjet)(TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C409416'] },
    () => {
      SettingsFinance.verifyItemInFinancePanel();
      SettingsFinance.verifyItemInDetailPanel();
      SettingsFinance.checkFundType(newFundTypes);
      SettingsFinance.checkEditDeleteIcon(newFundTypes);
      SettingsFinance.clickExpenseClass();
      SettingsFinance.verifyItemInDetailPanel();
      SettingsFinance.checkExpenseClass(newExpenseClass, newExpenseClass.source);
      SettingsFinance.checkEditDeleteIcon(newExpenseClass);
    },
  );
});
