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
  const defaultfund = { ...Funds.defaultUiFund };
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
        defaultfund.ledgerName = ledgerResponse.name;
      });
    });
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        firstLocation = res;
      });
    });
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        secondLocation = res;
      });
    });
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        thirdLocation = res;
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
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      firstLocation.institutionId,
      firstLocation.campusId,
      firstLocation.libraryId,
      firstLocation.id,
    );
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      secondLocation.institutionId,
      secondLocation.campusId,
      secondLocation.libraryId,
      secondLocation.id,
    );
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      thirdLocation.institutionId,
      thirdLocation.campusId,
      thirdLocation.libraryId,
      thirdLocation.id,
    );
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423579 Add location when creating a fund restricted by location (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
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
