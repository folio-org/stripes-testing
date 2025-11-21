import {
  KeyValue,
  Button,
  DropdownMenu,
  Modal,
  MultiColumnListCell,
  Pane,
  HTML,
  Section,
  including,
  Accordion,
  Badge,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

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
  closeInRightForm() {
    cy.do(
      Section({ id: 'movement-to-instance-details' })
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

  verifyItemBarcodeInHoldings(barcode, holdingsLocation, isExist = true) {
    const targetCell = Accordion({ label: including(`Holdings: ${holdingsLocation}`) }).find(
      MultiColumnListCell({ content: barcode }),
    );
    if (isExist) cy.expect(targetCell.exists());
    else cy.expect(targetCell.absent());
  },

  checkHoldingsMoveSuccessCallout(holdingsCount) {
    const message =
      holdingsCount === 1
        ? '1 holding has been successfully moved.'
        : `${holdingsCount} holdings have been successfully moved.`;
    InteractorsTools.checkCalloutMessage(message);
  },

  verifyHoldingsLocationInInstancePane(holdingsLocation, instanceTitle, isExist = true) {
    const targetAccordion = Pane(including(instanceTitle)).find(
      Accordion({ label: including(`Holdings: ${holdingsLocation}`) }),
    );
    if (isExist) cy.expect(targetAccordion.exists());
    else cy.expect(targetAccordion.absent());
  },
};
