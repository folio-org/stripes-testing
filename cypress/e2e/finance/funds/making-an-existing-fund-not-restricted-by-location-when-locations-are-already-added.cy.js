import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Funds', () => {
  const defaultFund = { ...Funds.defaultUiFund, restrictByLocations: true, locations: [] };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  let user;
  let location;

  before(() => {
    cy.getAdminToken();

    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      cy.getLocations({ limit: 1 }).then((res) => {
        location = res;
        if (defaultFund.locations.length === 0) {
          defaultFund.locations.push({});
        }
        defaultFund.locations[0].locationId = location.id;
        defaultFiscalYear.id = response.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;
          Funds.createViaApi(defaultFund).then((fundResponse) => {
            defaultFund.id = fundResponse.fund.id;
          });
        });
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
    cy.getAdminToken();
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423597 Making an existing fund NOT restricted by location (when locations are already added) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423597'] },
    () => {
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.editBudget();
      Funds.clickRestrictByLocationsCheckbox();
      Funds.varifyLocationSectionAbsent();
      Funds.save();
      Funds.varifyFundIsSaved();
      Funds.waitForFundDetailsLoading();
      Funds.verifyCheckboxState('Restrict use by location', false);
      Funds.editBudget();
      Funds.clickRestrictByLocationsCheckbox();
      Funds.varifyLocationSectionExist();
      Funds.varifyLocationInSection(location.name);
      Funds.save();
      Funds.verifyCheckboxState('Restrict use by location', true);
    },
  );
});
