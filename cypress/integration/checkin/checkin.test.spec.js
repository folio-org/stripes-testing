import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import NewInctanceHoldingsItem from '../../support/fragments/inventory/newInctanceHoldingsItem';
import TestTypes from '../../support/dictionary/testTypes';
import NewUser from '../../support/fragments/user/newUser';
import SwitchServicePoint from '../../support/fragments/service_point/switchServicePoint';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';

describe('Check In - Actions ', () => {
  before('Create New Service point, Item, User and Check out item', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    NewServicePoint.createServicePoint();
    NewInctanceHoldingsItem.createItem();
    NewUser.createUser();
    SwitchServicePoint.addServicePointPermissions();
    SwitchServicePoint.logOutLogIn();
  });

  after('Delete New Service point, Item and User', () => {
    SwitchServicePoint.changeServicePointPreference();
    NewInctanceHoldingsItem.deleteItem();
    NewServicePoint.deleteServicePoint();
    NewUser.deleteUser();
  });

  it('C347631 Check in: Basic check in', { tags: [TestTypes.smoke] }, () => {
    CheckInActions.checkInItem();
    CheckInActions.existsFormColomns();
    CheckInActions.existsItemsInForm();
  });
});

