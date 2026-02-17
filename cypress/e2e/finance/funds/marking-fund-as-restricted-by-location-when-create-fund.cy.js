import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Funds', () => {
  const defaultfund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultfund.ledgerName = ledgerResponse.name;
      });
    });
    cy.createTempUser([permissions.uiFinanceViewEditCreateFundAndBudget.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      },
    );
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(defaultfund.name);
    Funds.selectFund(defaultfund.name);
    Funds.deleteFundViaActions();
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423530 Marking Fund as restricted by location when create a fund (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423530'] },
    () => {
      Funds.newFund();
      Funds.fillInRequiredFields(defaultfund);
      Funds.clickRestrictByLocationsCheckbox();
      Funds.varifyLocationSectionExist();
      Funds.save();
      Funds.varifyLocationRequiredError();
      Funds.clickRestrictByLocationsCheckbox();
      Funds.varifyLocationSectionAbsent();
      Funds.save();
      Funds.varifyFundIsSaved();
      Funds.waitForFundDetailsLoading();
    },
  );
});
