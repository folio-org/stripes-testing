import NewServicePoint from './newServicePoint';
import { TextField, Dropdown, MultiColumnList, Button, Pane, Select } from '../../../../interactors';
import TopMenu from '../topMenu';
import defaultUser from '../users/userDefaultObjects/defaultUser';
import permissions from '../../dictionary/permissions';
import UsersSearchPane from '../users/usersSearchPane';
import UsersEditPage from '../users/usersEditPage';

export default {
  addServicePointPermissions: (username) => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(username);
    UsersSearchPane.openUser(username);

    UsersEditPage.addPermissions([permissions.checkinAll.gui]);
    UsersEditPage.addServicePoints([NewServicePoint.defaultUiServicePoint.body.name]);
    UsersEditPage.saveAndClose();
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
    cy.do(TextField({ id: 'input-user-search' }).fillIn(defaultUser.defaultUiPatron.body.username));
    cy.do(Button('Search').click());
    cy.do(MultiColumnList().click({ row: 0, column: 'Active' }));
    cy.do(Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click());
    cy.do(Button({ id: 'clickable-edituser' }).click());
    cy.do(Button({ id: 'accordion-toggle-button-servicePoints' }).click());
    cy.do(Select({ id: 'servicePointPreference' }).choose('None'));
    cy.do(Button({ id: 'clickable-save' }).click());
  }
};
