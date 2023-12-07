import { Permissions } from '../../../support/dictionary';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import ExpenseClasses from '../../../support/fragments/settings/finance/expenseClasses';
import FundTypes from '../../../support/fragments/settings/finance/fundTypes';

describe('Fund type view', () => {
  let userData;
  let servicePointId;
  const patronGroup = {
    name: getTestEntityValue('groupPermissions'),
  };
  const newFundTypes = { ...FundTypes.getDefaultFundTypes() };
  const newExpenseClass = { ...ExpenseClasses.getDefaultExpenseClass() };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
        servicePointId = servicePoints[0].id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      ExpenseClasses.createExpenseClassViaApi(newExpenseClass);
      FundTypes.createFundTypesViaApi(newFundTypes);
      cy.createTempUser([Permissions.uiSettingsFinanceView.gui], patronGroup.name).then(
        (userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.fundTypesPath,
            waiter: SettingsFinance.waitFundTypesLoading,
          });
        },
      );
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    ExpenseClasses.deleteExpenseClassViaApi(newExpenseClass.id);
    FundTypes.deleteFundTypesViaApi(newFundTypes.id);
  });

  it(
    'C409416 A user with "Settings (Finance): View settings" permission can only view appropriate settings (Thunderjet)(TaaS)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      SettingsFinance.verifyItemInFinancePanel();
      SettingsFinance.verifyItemInDetailPanel();
      SettingsFinance.checkFundType(newFundTypes);
      SettingsFinance.checkEditDeleteIcon(newFundTypes);
      SettingsFinance.clickExpenseClass();
      SettingsFinance.verifyItemInDetailPanel();
      SettingsFinance.checkExpenseClass(newExpenseClass);
      SettingsFinance.checkEditDeleteIcon(newExpenseClass);
    },
  );
});
