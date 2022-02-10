import { KeyValue, Button, DropdownMenu, Checkbox, Modal, HTML } from '../../../../../interactors';

export default {
  waitLoading(currentinstanceHrId, instanceHrIdNew) {
    cy.expect(KeyValue('Instance HRID', { value: currentinstanceHrId }).exists());
    cy.expect(KeyValue('Instance HRID', { value: instanceHrIdNew }).exists());
  },
  // TODO: redesign to elements attributes with id
  move() {
    cy.do(Checkbox('Select/unselect item for movement').click());
    cy.do(Button('Move to').click());
    cy.do(DropdownMenu().find(Button()).click());
    cy.do(Modal('Confirm move').find(Button('Continue')).click());
    cy.expect(HTML({ id:'inventory-module-display' }).exists());
  }


};
