import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('ui-finance: Funds', () => {
  const defaultFund = { ...Funds.defaultUiFund, restrictByLocations: true, locations: [] };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  let user;
  let servicePointId;
  let firstLocation;
  let secondLocation;

  before(() => {
    cy.getAdminToken();

    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      ServicePoints.getViaApi().then((servicePoint) => {
        servicePointId = servicePoint[0].id;

        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
          (firstLocationResponse) => {
            firstLocation = firstLocationResponse;
            defaultFund.locations.push({ locationId: firstLocation.id });

            NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
              (secondLocationResponse) => {
                secondLocation = secondLocationResponse;
                defaultFund.locations.push({ locationId: secondLocation.id });

                defaultFiscalYear.id = response.id;
                defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

                Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
                  defaultLedger.id = ledgerResponse.id;
                  defaultFund.ledgerId = defaultLedger.id;

                  Funds.createViaApi(defaultFund).then((fundResponse) => {
                    defaultFund.id = fundResponse.fund.id;
                  });
                });
              },
            );
          },
        );

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
    });
  });

  after(() => {
    cy.getAdminToken();
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423441 Remove location when editing a fund restricted by location (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.editBudget();
      Funds.varifyLocationInSection(firstLocation.name);
      Funds.varifyLocationInSection(secondLocation.name);
      Funds.removeLocation(firstLocation.name);
      Funds.varifyLocationInSection(secondLocation.name);
      Funds.varifyLocationIsAbsentInSection(firstLocation.name);
      Funds.save();
      Funds.varifyFundIsSaved();
      Funds.waitForFundDetailsLoading();
      Funds.verifyCheckboxState('Restrict use by location', true);
    },
  );
});
