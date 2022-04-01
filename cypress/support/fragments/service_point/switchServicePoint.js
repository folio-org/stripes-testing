import NewServicePoint from './newServicePoint';
import NewUser from '../user/newUser';
import { TextField, Checkbox, Dropdown, MultiColumnList, Button, Pane, Select, Modal, SearchField, Accordion } from '../../../../interactors';
import TopMenu from '../topMenu';
import defaultUser from '../user/defaultUser';

export default {
  addServicePointPermissions: (username) => {
    cy.visit(TopMenu.usersPath);
    cy.do([
      TextField({ id: 'input-user-search' }).fillIn(username),
      Button('Search').click(),
      MultiColumnList().click({ row: 0, column: 'Active' }),
      Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click(),
      Button({ id: 'clickable-edituser' }).click(),
      Button({ id: 'accordion-toggle-button-servicePoints' }).click(),
      Button({ id: 'add-service-point-btn' }).click(),
    ]);
    cy.get('#list-column-selected').click();
    cy.do([
      Button({ id: 'save-service-point-btn' }).click(),
      Select({ id: 'servicePointPreference' }).choose(NewServicePoint.defaultUiServicePoint.body.name),
      Button({ id: 'accordion-toggle-button-permissions' }).click(),
      Button({ id: 'clickable-add-permission' }).click(),
      // Button({ id: 'clickable-list-column-selected' }).click(),
      Modal({ id: 'permissions-modal' }).find(TextField({ type: 'search' })).fillIn('check in'),
      Button('Search').click(),
      MultiColumnList().click({ tabindex: 0 }),
      Button({ id: 'clickable-permissions-modal-save' }).click(),
      // Button({ id: 'accordion-toggle-button-permissions' }).click(),
    ]);
    cy.wait(3000);
    cy.do(Button('Save & close').click());
    cy.wait(3000);
    cy.do(Button('User permissions').click());
    cy.wait(3000);
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
