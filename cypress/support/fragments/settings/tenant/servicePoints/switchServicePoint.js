/* eslint-disable cypress/no-unnecessary-waiting */
import NewServicePoint from './newServicePoint';
import { Dropdown, Button, including } from '../../../../../../interactors';
import TopMenu from '../../../topMenu';
import permissions from '../../../../dictionary/permissions';
import UsersSearchPane from '../../../users/usersSearchPane';
import SelectServicePointModal from './selectServicePointModal';
import UserEdit from '../../../users/userEdit';

export default {
  addServicePointPermissions: (username) => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(username);
    UsersSearchPane.openUser(username);

    UserEdit.addPermissions([permissions.checkinAll.gui]);
    UserEdit.addServicePoints(NewServicePoint.defaultUiServicePoint.body.name);
    UserEdit.saveAndClose();
  },

  switchServicePoint: (servicePoint) => {
    cy.wait(4000);
    cy.do([Dropdown({ id: 'profileDropdown' }).open(), Button('Switch service point').click()]);
    cy.wait(2000);
    SelectServicePointModal.selectServicePoint(servicePoint);
    // wait for data to be loaded
    cy.wait(3000);
  },

  checkIsServicePointSwitched: (name) => {
    cy.expect(
      Dropdown({ id: 'profileDropdown' })
        .find(Button(including(name)))
        .exists(),
    );
  },
};
