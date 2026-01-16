import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance: Funds', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const firstLedger = { ...Ledgers.defaultUiLedger, restrictEncumbrance: false };
  const firstFund = { ...Funds.defaultUiFund };
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
        firstLedger.id = ledgerResponse.id;
        firstFund.ledgerId = firstLedger.id;
        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
        });
      });
    });

    cy.createTempUser([permissions.uiFinanceViewFundAndBudget.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Funds.deleteFundViaApi(firstFund.id);
    Ledgers.deleteLedgerViaApi(firstLedger.id);
    FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C353528 A user is not able to create planned budget if upcoming fiscal year does not exist (Thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C353528'] },
    () => {
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.varifyCanNotCreatePlannedBudget();
    },
  );
});
