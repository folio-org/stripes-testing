import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Groups from '../../../support/fragments/finance/groups/groups';

describe('ui-finance: Groups', () => {
  const defaultfund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultGroup = { ...Groups.defaultUiGroup };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear)
      .then(response => {
        defaultFiscalYear.id = response.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

        Ledgers.createViaApi(defaultLedger)
          .then(ledgerResponse => {
            defaultLedger.id = ledgerResponse.id;
            defaultfund.ledgerId = defaultLedger.id;
            Groups.createViaApi(defaultGroup)
              .then(groupResponse => {
                defaultGroup.id = groupResponse.id;
                Funds.createViaApi(defaultfund)
                  .then(fundResponse => {
                    defaultfund.id = fundResponse.fund.id;
                  });
              });
          });
      });
    cy.createTempUser([
      permissions.uiFinanceViewEditDeletFundBudget.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.fundPath, waiter: Funds.waitLoading });
      });
  });

  after(() => {
    Funds.deleteFundViaApi(defaultfund.id);
    Groups.deleteGroupViaApi(defaultGroup.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it('C4056 Add funds to a group (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    FinanceHelp.searchByName(defaultfund.name);
    FinanceHelp.selectFromResultsList();
    Funds.addGroupToFund(defaultGroup.name);
    InteractorsTools.checkCalloutMessage('Fund has been saved');
    Funds.checkAddGroupToFund(defaultGroup.name);
  });
});
