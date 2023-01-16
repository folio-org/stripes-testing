import { KeyValue, Button, DropdownMenu, Modal, HTML, Section, including, Accordion } from '../../../../../interactors';

export default {
  waitLoading(currentinstanceHrId, instanceHrIdNew) {
    cy.expect(KeyValue('Instance HRID', { value: currentinstanceHrId }).exists());
    cy.expect(KeyValue('Instance HRID', { value: instanceHrIdNew }).exists());
  },
  // TODO: redesign to elements attributes with id
  move() {
    cy.do(Button('Move to').click());
    cy.do(DropdownMenu().find(Button()).click());
    cy.do(Modal('Confirm move').find(Button('Continue')).click());
    cy.expect(HTML({ id:'inventory-module-display' }).exists());
  },
  moveFromMultiple(holdingName) {
    cy.do(Accordion({ label: including(`Holdings: ${holdingName}`) }).find(Button('Move to')).click());
    cy.do(DropdownMenu().find(Button()).click());
    cy.do(Modal('Confirm move').find(Button('Continue')).click());
  },
  closeInLeftForm() {
    cy.do(Section({ id: 'movement-from-instance-details' }).find(Button({ icon: 'times' })).click());
  }
};
