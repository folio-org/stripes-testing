import {
  Pane,
  Button,
  Accordion,
  TextField,
  MultiColumnListRow,
  Checkbox,
  MultiColumnListCell,
  Modal
} from '../../../../interactors';

export default {
  addPermissions(permissions) {
    cy.do([
      Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click(),
      Button('Edit').click(),
      Accordion({ id: 'permissions' }).clickHeader(),
      Button({ id: 'clickable-add-permission' }).click()
    ]);

    permissions.forEach(permission => {
      cy.do(TextField('User search').fillIn(permission));
      cy.expect(TextField('User search').is({ value: permission }));
      cy.do(Button('Search').click());
      cy.expect(MultiColumnListCell({ content: permission }).exists());
      cy.do(MultiColumnListRow({ index: 0 }).find(Checkbox()).click());
    });

    cy.do(Button('Save & close').click());
  },

  addServicePoints(points) {
    cy.do([
      Button({ id: 'accordion-toggle-button-servicePoints' }).click(),
      Button({ id: 'add-service-point-btn' }).click(),
    ]);

    points.forEach(point => {
      cy.do(MultiColumnListRow({ content: point, isContainer: true }).find(Checkbox()).click());
    });

    cy.do(Modal().find(Button('Save & close')).click());
  },

  saveAndClose() {
    cy.do(Button('Save & close').click());
  }
};
