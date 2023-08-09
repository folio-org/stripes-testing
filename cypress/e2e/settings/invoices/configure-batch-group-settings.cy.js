import NewBatchGroup from '../../../support/fragments/invoices/newBatchGroup';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';

describe('Invoices: Settings(Invoices)', () => {
  const batchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  const newBatchGroup = { ...NewBatchGroup.defaultUiBatchGroup };
  let user;

  before(() => {
    cy.loginAsAdmin();
    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiOrdersView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:SettingsMenu.invoiceBatchGroupsPath, waiter: Ledgers.waitForLedgerDetailsLoading });
      });
    cy.visit(`${SettingsMenu.invoiceBatchGroupsPath}`);
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it('C10939 Configure batch group settings (thunderjet)', { tags: [TestType.smoke, devTeams.thunderjet] }, () => {
    SettingsInvoices.waitBatchGroupsLoading();
    SettingsInvoices.createNewBatchGroup(batchGroup);
    SettingsInvoices.checkBatchGroup(batchGroup);
    newBatchGroup.name += 'updated';
    newBatchGroup.description += 'updated';
    SettingsInvoices.editBatchGroup(newBatchGroup, batchGroup.name);
    SettingsInvoices.checkBatchGroup(newBatchGroup);
    SettingsInvoices.deleteBatchGroup(newBatchGroup);
  });
});
