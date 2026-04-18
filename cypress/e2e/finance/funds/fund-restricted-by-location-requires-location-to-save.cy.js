import permissions from '../../../support/dictionary/permissions';
import FundEditForm from '../../../support/fragments/finance/funds/fundEditForm';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Funds', () => {
  const defaultfund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  let user;
  let servicePointId;
  let location;
  let locationData;

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

    ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
      servicePointId = servicePoints[0].id;
      locationData = NewLocation.getDefaultLocation(servicePointId);
      NewLocation.createViaApi(locationData).then((res) => {
        location = res;
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
    Funds.getFundsViaApi({ query: `code="${defaultfund.code}"` }).then((body) => {
      Funds.deleteFundViaApi(body.funds[0].id);
    });
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      locationData.institutionId,
      locationData.campusId,
      locationData.libraryId,
      locationData.id,
    );
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C434073 When "Restrict use by location" checkbox is checked, user is able to save new fund only with at least one location added (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C434073'] },
    () => {
      Funds.newFund();
      Funds.verifyCheckboxState('Restrict use by location', false);
      FundEditForm.checkButtonsConditions([
        { label: 'Save & close', conditions: { disabled: true } },
      ]);

      Funds.fillInRequiredFields(defaultfund);
      FundEditForm.checkButtonsConditions([
        { label: 'Save & close', conditions: { disabled: false } },
      ]);

      Funds.clickRestrictByLocationsCheckbox();
      Funds.varifyLocationSectionExist();
      Funds.varifyLocationRequiredError();
      Funds.verifyNoLocationsFound();
      Funds.verifyUnassignAllLocationsButtonState(true);

      Funds.save();
      FundEditForm.waitLoading();
      Funds.varifyLocationRequiredError();

      Funds.openAddLocationModal();
      Funds.verifySelectLocationsModalFilterAccordions();
      Funds.verifySelectLocationsModalColumns();
      Funds.verifySelectLocationsModalButtons();
      Funds.verifyTotalSelectedLocations(0);

      Funds.selectLocationByName(location.name);
      Funds.verifyTotalSelectedLocations(1);

      Funds.saveLocationsModal();
      Funds.varifyLocationInSection(location.name);
      Funds.verifyUnassignAllLocationsButtonState(false);

      Funds.save();
      Funds.varifyFundIsSaved();
      Funds.waitForFundDetailsLoading();
      Funds.verifyCheckboxState('Restrict use by location', true);
    },
  );
});
