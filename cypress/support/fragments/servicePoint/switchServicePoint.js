import NewServicePoint from '../settings/tenant/servicePoints/newServicePoint';
import { Dropdown, Button } from '../../../../interactors';
import TopMenu from '../topMenu';
import permissions from '../../dictionary/permissions';
import UsersSearchPane from '../users/usersSearchPane';
import UserEdit from '../users/userEdit';

export default {
  addServicePointPermissions: (username) => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(username);
    UsersSearchPane.openUser(username);

    UserEdit.addPermissions([permissions.checkinAll.gui]);
    UserEdit.addServicePoints(NewServicePoint.defaultUiServicePoint.body.name);
    UserEdit.saveAndClose();
  },

  logOutAndLogIn: (userName, password) => {
    cy.do([
      Dropdown('My profile').open(),
      Button('Log out').click(),
    ]);
    cy.login(userName, password);
  }
};
