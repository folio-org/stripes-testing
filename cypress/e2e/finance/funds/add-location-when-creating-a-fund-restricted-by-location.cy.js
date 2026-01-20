import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Funds', () => {
  const defaultfund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  let user;
  let firstLocation;
  let secondLocation;
  let thirdLocation;

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

    InventoryInstances.getLocations({ limit: 3 }).then((res) => {
      [firstLocation, secondLocation, thirdLocation] = res;
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
    Funds.getFundsViaApi({ query: `code="${defaultfund.code}"` }).then((body) => {
      Funds.deleteFundViaApi(body.funds[0].id);
    });
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423579 Add location when creating a fund restricted by location (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423579'] },
    () => {
      Funds.newFund();
      Funds.fillInRequiredFields(defaultfund);
      Funds.clickRestrictByLocationsCheckbox();
      Funds.varifyLocationSectionExist();
      Funds.addLocationToFund(firstLocation.name);
      Funds.addLocationToFund(secondLocation.name);
      Funds.addLocationToFund(thirdLocation.name);
      Funds.varifyLocationInSection(firstLocation.name);
      Funds.varifyLocationInSection(secondLocation.name);
      Funds.varifyLocationInSection(thirdLocation.name);
      Funds.save();
      Funds.varifyFundIsSaved();
      Funds.waitForFundDetailsLoading();
      Funds.verifyCheckboxState('Restrict use by location', true);
    },
  );
});
