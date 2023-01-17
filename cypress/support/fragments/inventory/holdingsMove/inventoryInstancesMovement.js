import { KeyValue, Button, DropdownMenu, Modal, HTML, Section, including, Accordion } from '../../../../../interactors';
const confirmMoveButton = Modal('Confirm move').find(Button('Continue'));

export default {
  waitLoading(currentinstanceHrId, instanceHrIdNew) {
    cy.expect(KeyValue('Instance HRID', { value: currentinstanceHrId }).exists());
    cy.expect(KeyValue('Instance HRID', { value: instanceHrIdNew }).exists());
  },
  // TODO: redesign to elements attributes with id
  move() {
    cy.do(Button('Move to').click());
    cy.do(DropdownMenu().find(Button()).click());
    cy.do(confirmMoveButton.click());
    cy.expect(HTML({ id:'inventory-module-display' }).exists());
  },
  closeInLeftForm() {
    cy.do(Section({ id: 'movement-from-instance-details' }).find(Button({ icon: 'times' })).click());
  }
};
