import Permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import FiscalYearDetails from '../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import Funds from '../../support/fragments/finance/funds/funds';
import FundDetails from '../../support/fragments/finance/funds/fundDetails';
import Groups from '../../support/fragments/finance/groups/groups';
import GroupDetails from '../../support/fragments/finance/groups/groupDetails';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import LedgerDetails from '../../support/fragments/finance/ledgers/ledgerDetails';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Finance', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultGroup = { ...Groups.defaultUiGroup };
  const defaultFund = { ...Funds.defaultUiFund };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Groups.createViaApi(defaultGroup).then((groupResponse) => {
          defaultGroup.id = groupResponse.id;
        });

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
        });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFiscalYear.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiFinanceViewGroups.gui,
      Permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.financePath,
        waiter: Ledgers.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Groups.deleteGroupViaApi(defaultGroup.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C369083 Finance | Results List | Verify that values in "Name" columns are hyperlink (Thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C369083'] },
    () => {
      FinanceHelp.clickFiscalYearButton();
      FiscalYears.waitLoading();
      FiscalYears.searchByName(defaultFiscalYear.name);
      FiscalYears.expextFY(defaultFiscalYear.name);

      FiscalYears.selectFisacalYear(defaultFiscalYear.name);
      FiscalYearDetails.verifyFiscalYearName(defaultFiscalYear.name);

      FinanceHelp.clickLedgerButton();
      Ledgers.waitLoading();

      Ledgers.searchByName(defaultLedger.name);
      Ledgers.verifyLedgerLinkExists(defaultLedger.name);

      Ledgers.selectLedger(defaultLedger.name);
      LedgerDetails.verifyLedgerName(defaultLedger.name);

      FinanceHelp.clickGroupButton();
      Groups.waitLoading();

      Groups.searchByName(defaultGroup.name);
      Groups.checkCreatedInList(defaultGroup.name);

      Groups.selectGroupByName(defaultGroup.name);
      GroupDetails.verifyGroupName(defaultGroup.name);

      FinanceHelp.clickFundButton();
      Funds.waitLoading();

      Funds.searchByName(defaultFund.name);
      Funds.verifyFundLinkNameExists(defaultFund.name);

      Funds.selectFund(defaultFund.name);
      FundDetails.verifyFundName(defaultFund.name);
    },
  );
});
