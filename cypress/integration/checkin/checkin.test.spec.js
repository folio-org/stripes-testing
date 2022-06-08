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
import UsersEditPage from '../../support/fragments/users/usersEditPage';

// TODO: We need to move all api methods to fragments. https://issues.folio.org/browse/FAT-1624
// When bug(https://issues.folio.org/browse/FAT-1637) will be fixed check full run test!!!

describe('Check In - Actions ', () => {
  before('Create New Service point, Item, User and Check out item', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();
    ServicePoints.createViaApi(NewServicePoint.defaultUiServicePoint.body);
    institutions.createViaApi(institutions.defaultUiInstitutions.body);
    const specialCampuse = { ...campuses.defaultUiCampuses.body };
    specialCampuse.institutionId = institutions.defaultUiInstitutions.body.id;
    campuses.createViaApi(specialCampuse);

    const specialLibrary = { ...libraries.defaultUiLibraries.body };
    specialLibrary.campusId = specialCampuse.id;

    libraries.createViaApi(specialLibrary);
    cy.getLocations().then(location => {
      NewInctanceHoldingsItem.createItemWithSameParams(location.id);
      NewUser.createUserWithSameParams().then(userProperties => {
        SwitchServicePoint.addServicePointPermissions(userProperties.userName);
        SwitchServicePoint.logOutAndLogIn(userProperties);
      });
    });
  });

  after('Delete New Service point, Item and User', () => {
    SwitchServicePoint.logOutAndLogInByDiku();
    UsersEditPage.changeServicePointPreference();
    NewInctanceHoldingsItem.deleteItemWithSameParams();
    NewServicePoint.deleteServicePointViaApi();
    NewUser.deleteUserWithSameParams();
  });

  it('C347631 Check in: Basic check in', { tags: [TestTypes.smoke] }, () => {
    CheckInActions.checkInItem();
    CheckInActions.existsFormColomns();
    CheckInActions.existsItemsInForm();
  });
});

