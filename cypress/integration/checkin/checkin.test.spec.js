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
    institutions.createViaApi(institutions.defaultUiInstitutions.body);
    const specialCampuse = { ...campuses.defaultUiCampuses.body };
    specialCampuse.institutionId = institutions.defaultUiInstitutions.body.id;
    campuses.createViaApi(specialCampuse);

    const specialLibrary = { ...libraries.defaultUiLibraries.body };
    specialLibrary.campusId = specialCampuse.id;

    libraries.createViaApi(specialLibrary);
    cy.getLocations().then(location => {
      NewInctanceHoldingsItem.createItem(location.id);
      NewUser.createUser().then(userProperties => {
        SwitchServicePoint.addServicePointPermissions(userProperties.userName);
        SwitchServicePoint.logOutLogIn(userProperties);
      });
    });
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

