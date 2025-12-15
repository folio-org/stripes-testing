import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import fundEditForm from '../../../support/fragments/finance/funds/fundEditForm';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Funds', () => {
    const defaultFund = { ...Funds.defaultUiFund, restrictByLocations: true, locations: [] };
    const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    let user;
    let servicePointId;
    let firstLocation;
    let firstLocationData;
    let secondLocation;
    let secondLocationData;

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

            firstLocationData = NewLocation.getDefaultLocation(servicePointId);
            NewLocation.createViaApi(firstLocationData).then((res) => {
              firstLocation = res;
              defaultFund.locations.push({ locationId: firstLocation.id });

              secondLocationData = NewLocation.getDefaultLocation(servicePointId);
              NewLocation.createViaApi(secondLocationData).then((res2) => {
                secondLocation = res2;
                defaultFund.locations.push({ locationId: secondLocation.id });

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
              });
            });
          });
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Funds.deleteFundViaApi(defaultFund.id);
      [firstLocationData, secondLocationData].forEach((location) => {
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
      'C423594 Unassign all locations when editing a fund restricted by location (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C423594'] },
      () => {
        FinanceHelp.searchByName(defaultFund.name);
        Funds.selectFund(defaultFund.name);
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState('Restrict use by location', true);

        Funds.editFund();
        Funds.varifyLocationInSection(firstLocation.name);
        Funds.varifyLocationInSection(secondLocation.name);
        Funds.verifyUnassignAllLocationsButtonState(false);

        Funds.clickUnassignAllLocationsButton();
        Funds.verifyUnassignAllLocationsModal();

        Funds.selectActionInUnassignAllLocationsModal('cancel');
        Funds.varifyLocationInSection(firstLocation.name);
        Funds.varifyLocationInSection(secondLocation.name);

        Funds.clickUnassignAllLocationsButton();
        Funds.verifyUnassignAllLocationsModal();

        Funds.selectActionInUnassignAllLocationsModal('confirm');
        Funds.verifyNoLocationsFound();
        Funds.verifyUnassignAllLocationsButtonState(true);

        Funds.cancelEditingFund();
        Funds.verifyAreYouSureModal();

        Funds.closeWithoutSaving();
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState('Restrict use by location', true);

        Funds.editFund();
        Funds.varifyLocationInSection(firstLocation.name);
        Funds.varifyLocationInSection(secondLocation.name);
        Funds.verifyUnassignAllLocationsButtonState(false);

        Funds.clickUnassignAllLocationsButton();
        Funds.verifyUnassignAllLocationsModal();

        Funds.selectActionInUnassignAllLocationsModal('confirm');
        Funds.verifyNoLocationsFound();
        Funds.verifyUnassignAllLocationsButtonState(true);

        Funds.cancelEditingFund();
        Funds.verifyAreYouSureModal();

        fundEditForm.keepEditingFund();

        fundEditForm.clickSaveAndCloseButton({ fundSaved: false });
        Funds.varifyLocationRequiredError();
      },
    );
  });
});
