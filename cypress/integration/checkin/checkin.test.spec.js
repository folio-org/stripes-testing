import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import NewInctanceHoldingsItem from '../../support/fragments/inventory/newInctanceHoldingsItem';
import TestTypes from '../../support/dictionary/testTypes';
import NewUser from '../../support/fragments/user/newUser';
import SwitchServicePoint from '../../support/fragments/service_point/switchServicePoint';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints';
import institutions from '../../support/fragments/settings/tenant/institutions';
import campuses from '../../support/fragments/settings/tenant/campuses';
import libraries from '../../support/fragments/settings/tenant/libraries';



// TODO: We need to move all api methods to fragments. https://issues.folio.org/browse/FAT-1624

describe('Check In - Actions ', () => {
  before('Create New Service point, Item, User and Check out item', () => {
    // const createServicePointViaApi = () => {

    // };
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    ServicePoints.createViaApi(NewServicePoint.defaultUiServicePoint.body);
    // cy.getInstitutionApi({ method: 'POST', body: NewServicePoint.defaultUiInstitutions.body });
    institutions.createViaApi(institutions.defaultUiInstitutions.body);
    // cy.getCampusesApi({ method: 'POST', body: NewServicePoint.defaultUiCampuses.body });
    campuses.createViaApi(campuses.defaultUiCampuses.body);
    // cy.getLibrariesApi({ method: 'POST', body: NewServicePoint.defaultUiLibraries.body });
    libraries.createViaApi(libraries.defaultUiLibraries.body);
    cy.getLocations({ method: 'POST', body: NewServicePoint.defaultUiLocations.body });
    NewInctanceHoldingsItem.createItem();
    NewUser.createUser();
    SwitchServicePoint.addServicePointPermissions();
    SwitchServicePoint.logOutLogIn();
  });

  // after('Delete New Service point, Item and User', () => {
  //   SwitchServicePoint.changeServicePointPreference();
  //   NewInctanceHoldingsItem.deleteItem();
  //   NewServicePoint.deleteServicePoint();
  //   NewUser.deleteUser();
  // });

  it('C347631 Check in: Basic check in', { tags: [TestTypes.smoke] }, () => {
    CheckInActions.checkInItem();
    CheckInActions.existsFormColomns();
    CheckInActions.existsItemsInForm();
  });
});

