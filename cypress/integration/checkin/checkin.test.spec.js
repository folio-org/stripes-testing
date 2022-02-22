import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import NewInctanceHoldingsItem from '../../support/fragments/inventory/newInctanceHoldingsItem';
import { Button, Pane, including } from '../../../interactors';
import testTypes from '../../support/dictionary/testTypes';
// import TopMenu from '../../topMenu';
import NewUser from '../../support/fragments/user/newUser';
import SwitchServicePoint from '../../support/fragments/service_point/switchServicePoint';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';




describe('Check In - Actions ', () => {
  before('Create New Service point, Item, User and Check out item', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    NewServicePoint.servicePoint();
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


  it('Check In - Actions', { tags: [testTypes.smoke] }, () => {
    CheckInActions.checkInItem();
    cy.expect([
      Button('Loan details').exists(),
      Button('Patron details').exists(),
      Button('Item details').exists(),
      Button('New Fee/Fine').exists(),
    ]);
    cy.do(Button('Loan details').click());
    cy.expect(Pane(including(NewUser.userName)).exists());
    CheckInActions.returnCheckIn();
    cy.do(Button('Patron details').click());
    cy.expect(Pane({ title: NewUser.userName }).exists());
    CheckInActions.returnCheckIn();
    cy.do(Button('Item details').click());
    cy.expect(Pane(including(NewInctanceHoldingsItem.itemBarcode)).exists());
    CheckInActions.returnCheckIn();
    cy.do(Button('New Fee/Fine').click());
    cy.expect(Pane({ title:  'New fee/fine' }).exists());
    CheckInActions.returnCheckIn();
  });
});

