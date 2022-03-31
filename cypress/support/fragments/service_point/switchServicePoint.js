import NewServicePoint from './newServicePoint';
import NewUser from '../user/newUser';
import { TextField, Dropdown, MultiColumnList, Button, Pane, Select } from '../../../../interactors';
import TopMenu from '../topMenu';
import defaultUser from '../user/defaultUser';

export default {
  addServicePointPermissions: (username) => {
    cy.visit(TopMenu.usersPath);
    cy.do(TextField({ id: 'input-user-search' }).fillIn(username));
    cy.do(Button('Search').click());
    cy.do(MultiColumnList().click({ row: 0, column: 'Active' }));
    cy.do(Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click());
    cy.do(Button({ id: 'clickable-edituser' }).click());
    cy.do(Button({ id: 'accordion-toggle-button-servicePoints' }).click());
    cy.do(Button({ id: 'add-service-point-btn' }).click());
    cy.get('#list-column-selected').click();
    cy.do(Button({ id: 'save-service-point-btn' }).click());
    cy.do(Select({ id: 'servicePointPreference' }).choose(NewServicePoint.defaultUiServicePoint.body.name));
    cy.do(Button({ id: 'accordion-toggle-button-permissions' }).click());
    cy.do(Button({ id: 'clickable-add-permission' }).click());
    cy.get('#clickable-list-column-selected').click();
    cy.do(Button({ id: 'clickable-permissions-modal-save' }).click());
    cy.do(Button({ id: 'clickable-save' }).click());
  },

  logOutLogIn: ({ userName, password }) => {
    cy.do([
      Dropdown('My profile').open(),
      Button('Log out').click(),
    ]);
    cy.login(userName, password);
  },
  // we can remove the service point if it is not Preference
  changeServicePointPreference: () => {
    cy.visit(TopMenu.usersPath);
    cy.do(TextField({ id: 'input-user-search' }).fillIn(defaultUser.defaultUiPatron.body.userName));
    cy.do(Button('Search').click());
    cy.do(MultiColumnList().click({ row: 0, column: 'Active' }));
    cy.do(Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click());
    cy.do(Button({ id: 'clickable-edituser' }).click());
    cy.do(Button({ id: 'accordion-toggle-button-servicePoints' }).click());
    cy.do(Select({ id: 'servicePointPreference' }).choose('None'));
    cy.do(Button({ id: 'clickable-save' }).click());
  }
};
