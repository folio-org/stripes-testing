import {
  KeyValue,
  Button,
  DropdownMenu,
  Modal,
  HTML,
  Section,
  including,
  Accordion,
  Badge,
} from '../../../../../interactors';

const confirmMoveButton = Modal('Confirm move').find(Button('Continue'));

export default {
  waitLoading(currentinstanceHrId, instanceHrIdNew) {
    cy.expect(KeyValue('Instance HRID', { value: currentinstanceHrId }).exists());
    cy.expect(KeyValue('Instance HRID', { value: instanceHrIdNew }).exists());
  },
  // TODO: redesign to elements attributes with id
  move() {
    cy.do([
      Button('Move to').click(),
      DropdownMenu().find(Button()).click(),
      confirmMoveButton.click(),
    ]);
    cy.expect(HTML({ id: 'inventory-module-display' }).exists());
  },
  moveFromMultiple(holdingName, moveToTitle) {
    cy.do([
      Accordion({ label: including(`Holdings: ${holdingName}`) })
        .find(Button('Move to'))
        .click(),
      DropdownMenu().find(Button(moveToTitle)).click(),
      confirmMoveButton.click(),
    ]);
  },
  closeInLeftForm() {
    cy.do(
      Section({ id: 'movement-from-instance-details' })
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },
  verifyHoldingsMoved(holdingName, itemCount) {
    cy.expect(
      Accordion({ label: including(`Holdings: ${holdingName}`) })
        .find(Badge())
        .has({ text: itemCount }),
    );
  },
};
