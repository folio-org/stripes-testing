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
import ItemRecordView from '../item/itemRecordView';

const confirmMoveButton = Modal('Confirm move').find(Button('Continue'));
export const inventoryInstancesMovementPaneFrom = Section({ id: 'movement-from-instance-details' });
export const inventoryInstancesMovementPaneTo = Section({ id: 'movement-to-instance-details' });

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
  clickConfirmMoveButton() {
    cy.do(confirmMoveButton.click());
  },
  moveFromMultiple(holdingName, moveToTitle, { confirm = true } = {}) {
    cy.do([
      Accordion({ label: including(`Holdings: ${holdingName}`) })
        .find(Button('Move to'))
        .click(),
      DropdownMenu().find(Button(moveToTitle)).click(),
    ]);

    if (confirm) cy.do(confirmMoveButton.click());
  },
  closeInLeftForm() {
    cy.do(inventoryInstancesMovementPaneFrom.find(Button({ icon: 'times' })).click());
  },
  closeInRightForm() {
    cy.do(inventoryInstancesMovementPaneTo.find(Button({ icon: 'times' })).click());
  },
  openDestinationHolding(holdingName) {
    const targetAccordion = inventoryInstancesMovementPaneTo.find(
      Accordion({ label: including(`Holdings: ${holdingName}`) }),
    );

    cy.expect(targetAccordion.exists());
    cy.do(targetAccordion.clickHeader());
    cy.expect(targetAccordion.has({ open: true }));
  },
  openItemInDestinationHolding(holdingName, barcode) {
    const targetAccordion = inventoryInstancesMovementPaneTo.find(
      Accordion({ label: including(`Holdings: ${holdingName}`) }),
    );

    cy.expect(targetAccordion.has({ open: true }));
    cy.do(
      targetAccordion
        .find(MultiColumnListCell({ columnIndex: 3, content: barcode }))
        .find(Button(including(barcode)))
        .click(),
    );
    ItemRecordView.waitLoading();
  },
  verifyHoldingsMoved(holdingName, itemCount, { instancePaneIndex = null } = {}) {
    const holdingsAccordion = Accordion({ label: including(`Holdings: ${holdingName}`) });
    const targetAccordion =
      typeof instancePaneIndex === 'number'
        ? [inventoryInstancesMovementPaneFrom, inventoryInstancesMovementPaneTo][
          instancePaneIndex
        ].find(holdingsAccordion)
        : holdingsAccordion;
    cy.expect(targetAccordion.find(Badge()).has({ text: itemCount }));
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

  verifyConfirmMovePopupDisplayed() {
    cy.expect(Modal('Confirm move').exists());
    cy.expect(
      Modal('Confirm move')
        .find(HTML(including('This holdings is linked to a purchase order line')))
        .exists(),
    );
  },
};
