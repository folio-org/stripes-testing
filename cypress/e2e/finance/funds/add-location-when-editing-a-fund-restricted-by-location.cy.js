import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Funds', () => {
  const defaultFund = { ...Funds.defaultUiFund, restrictByLocations: true, locations: [] };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  let user;
  let servicePointId;
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
        defaultFund.ledgerId = defaultLedger.id;

        ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
          servicePointId = servicePoints[0].id;

          NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
            firstLocation = res;
            defaultFund.locations.push({ locationId: firstLocation.id });

            NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
              (res2) => {
                secondLocation = res2;
                defaultFund.locations.push({ locationId: secondLocation.id });

                NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                  (res3) => {
                    thirdLocation = res3;

                    Funds.createViaApi(defaultFund).then((fundResponse) => {
                      defaultFund.id = fundResponse.fund.id;

                      cy.createTempUser([permissions.uiFinanceViewEditFundAndBudget.gui]).then(
                        (userProperties) => {
                          user = userProperties;
                          cy.login(userProperties.username, userProperties.password, {
                            path: TopMenu.fundPath,
                            waiter: Funds.waitLoading,
                          });
                        },
                      );
                    });
                  },
                );
              },
            );
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Funds.deleteFundViaApi(defaultFund.id);
    [firstLocation, secondLocation, thirdLocation].forEach((location) => {
      NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
        location.institutionId,
        location.campusId,
        location.libraryId,
        location.id,
      );
    });
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423589 Add location when editing a fund restricted by location (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423589'] },
    () => {
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.waitForFundDetailsLoading();
      Funds.verifyCheckboxState('Restrict use by location', true);

      Funds.editBudget();
      Funds.varifyLocationSectionExist();
      Funds.varifyLocationInSection(firstLocation.name);
      Funds.varifyLocationInSection(secondLocation.name);

      Funds.openAddLocationModal();
      cy.wait(3000);
      Funds.verifyTotalSelectedLocations(2);

      Funds.clickActionsButtonInLocationsModal();
      Funds.verifyShowColumnsMenu();

      Funds.toggleColumnVisibilityInLocationsModal('Code', false);
      Funds.toggleColumnVisibilityInLocationsModal('Institution', false);
      cy.wait(1000);

      Funds.toggleColumnVisibilityInLocationsModal('Code', true);
      Funds.toggleColumnVisibilityInLocationsModal('Institution', true);
      cy.wait(1000);
      Funds.clickActionsButtonInLocationsModal();

      Funds.checkUnassignedLocationFilter();

      Funds.selectLocationByName(thirdLocation.name);
      Funds.verifyTotalSelectedLocations(3);

      Funds.verifyLocationNotPresentInModal(firstLocation.name);
      Funds.verifyLocationNotPresentInModal(secondLocation.name);

      Funds.saveLocationsModal();
      Funds.varifyLocationInSection(firstLocation.name);
      Funds.varifyLocationInSection(secondLocation.name);
      Funds.varifyLocationInSection(thirdLocation.name);
      Funds.verifyLocationWithDeleteIcon(thirdLocation.name);

      Funds.save();
      Funds.varifyFundIsSaved();
      Funds.waitForFundDetailsLoading();
      Funds.verifyCheckboxState('Restrict use by location', true);
    },
  );
});
