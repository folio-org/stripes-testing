import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Users from '../../../support/fragments/users/users';

describe('Finance: Funds', () => {
  let user;
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };

  before('Create user, fiscal year, ledger, and fund', () => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((fiscalYearId) => {
      defaultFiscalYear.id = fiscalYearId.id;
      defaultLedger.fiscalYearOneId = fiscalYearId.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerId) => {
        defaultLedger.id = ledgerId.id;
        defaultFund.ledgerId = ledgerId.id;
        Funds.createViaApi(defaultFund).then((fundId) => {
          defaultFund.id = fundId.fund.id;
        });
      });
    });

    cy.createTempUser([permissions.uiFinanceViewEditCreateFundAndBudget.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C353528 User is not able to create planned budget if upcoming fiscal year does not exist (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C353528'] },
    () => {
      Funds.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.checkEmptyBudgetSection();
    },
  );
});
