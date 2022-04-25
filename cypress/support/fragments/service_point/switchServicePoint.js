import NewServicePoint from './newServicePoint';
import { TextField, Dropdown, MultiColumnList, Button, Pane, Select, Modal, Accordion, HTML, including, MultiColumnListCell } from '../../../../interactors';
import TopMenu from '../topMenu';
import defaultUser from '../user/defaultUser';
import permissions from '../../dictionary/permissions';

export default {
  addServicePointPermissions: (username) => {
    cy.visit(TopMenu.usersPath);
    cy.do([
      TextField({ id: 'input-user-search' }).fillIn(username),
      Button('Search').click(),
      MultiColumnList().click({ row: 0, column: 'Active' }),
      Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click(),
      Button({ id: 'clickable-edituser' }).click()]);
    cy.intercept('/configurations/entries?query=(module==USERS%20and%20configName==custom_fields_label)').as('getPermissions1');
    cy.intercept('/perms/permissions?length=10000&query=(visible==true)').as('getPermissions2');
    cy.wait(['@getPermissions1', '@getPermissions2']);
    cy.do([Button({ id: 'accordion-toggle-button-servicePoints' }).click(),
      Button({ id: 'add-service-point-btn' }).click(),
    ]);
    cy.get('#list-column-selected').click();
    cy.do([
      Button({ id: 'save-service-point-btn' }).click(),
      Select({ id: 'servicePointPreference' }).choose(NewServicePoint.defaultUiServicePoint.body.name),
      Button({ id: 'accordion-toggle-button-permissions' }).click(),
      Button({ id: 'clickable-add-permission' }).click(),
      Modal({ id: 'permissions-modal' }).find(TextField({ type: 'search' })).fillIn(permissions.uiCheckinAll.gui),
      Modal({ id: 'permissions-modal' }).find(Button('Search')).click(),
      Modal({ id: 'permissions-modal' }).find(MultiColumnListCell(permissions.uiCheckinAll.gui)).click()]);
    cy.expect(Modal({ id: 'permissions-modal' }).find(HTML(including('Total selected: 1'))));
    cy.do(Button({ id: 'clickable-permissions-modal-save' }).click());
    cy.expect(Modal({ id: 'permissions-modal' }).absent());
    cy.expect(Accordion({ id: 'permissions' }).find(HTML(including(permissions.uiCheckinAll.gui))).exists());
    cy.do(Button('Save & close').click());
    cy.do(Button('User permissions').click());
  },

  logOutAndLogIn: ({ userName, password }) => {
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
  },
  switchToAssignedServicePoint:() => {
    cy.do([
      Dropdown('My profile').open(),
      Button('Switch service point').click(),
      Button({ id:'service-point-btn-0' }).click(),
    ]);
  },
  switchToNotAssignedServicePoint:() => {
    cy.do([
      Dropdown('My profile').open(),
      Button('Switch service point').click(),
      Button({ id:'service-point-btn-1' }).click(),
    ]);
  }
};
