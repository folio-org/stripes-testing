import NewServicePoint from '../../api/newServicePoint';
import NewUser from '../../api/newUser';
import { TextField, Dropdown, MultiColumnList, Button, Pane, Select } from '../../../../interactors';



export default {
  addServicePointPermissions: () => {
    cy.visit('/users');
    cy.do(TextField({ id: 'input-user-search' }).fillIn(NewUser.userName));
    cy.do(Button('Search').click());
    cy.do(MultiColumnList().click({ row: 0, column: 'Active' }));
    cy.do(Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click());
    cy.do(Button({ id: 'clickable-edituser' }).click());
    cy.do(Button({ id: 'accordion-toggle-button-servicePoints' }).click());
    cy.do(Button({ id: 'add-service-point-btn' }).click());
    cy.get('#list-column-selected').click();
    cy.do(Button({ id: 'save-service-point-btn' }).click());
    cy.do(Select({ id: 'servicePointPreference' }).choose(NewServicePoint.servicePointName));
    cy.do(Button({ id: 'accordion-toggle-button-permissions' }).click());
    cy.do(Button({ id: 'clickable-add-permission' }).click());
    cy.get('#clickable-list-column-selected').click();
    cy.do(Button({ id: 'clickable-permissions-modal-save' }).click());
    cy.do(Button({ id: 'clickable-save' }).click());
  },

  logOutLogIn: () => {
    cy.do([
      Dropdown('My profile').open(),
      Button('Log out').click(),
    ]);
    cy.login(NewUser.userLogin, NewUser.password);
  },
  // we can remove the service point if it is not Preference
  changeServicePointPreference: () => {
    cy.visit('/users');
    cy.do(TextField({ id: 'input-user-search' }).fillIn(NewUser.userName));
    cy.do(Button('Search').click());
    cy.do(MultiColumnList().click({ row: 0, column: 'Active' }));
    cy.do(Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click());
    cy.do(Button({ id: 'clickable-edituser' }).click());
    cy.do(Button({ id: 'accordion-toggle-button-servicePoints' }).click());
    cy.do(Select({ id: 'servicePointPreference' }).choose('None'));
    cy.do(Button({ id: 'clickable-save' }).click());
  }
};
