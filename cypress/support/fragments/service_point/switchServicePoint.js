import NewServicePoint from './newServicePoint';
import {
  Dropdown,
  Button,
} from '../../../../interactors';
import TopMenu from '../topMenu';
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
  }
};
