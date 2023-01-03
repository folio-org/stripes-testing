import {
  Button,
  Accordion,
  Checkbox,
  TextField,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiColumnList,
  Select,
  Pane,
  Link,
  Section,
  SelectionOption
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const actionsButton = Button('Actions');
const receivingSuccessful = 'Receiving successful';
const unreceivingSuccessful = 'Unreceiving successful';
const expectedPiecesAccordionId = 'expected';
const receivedPiecesAccordionId = 'received';
const receiveButton = Button('Receive');
const unreceiveButton = Button('Unreceive');

const searchByParameter = (parameter, value) => {
  cy.do(Select({ id: 'input-record-search-qindex' }).choose(parameter));
  cy.do(TextField({ id:'input-record-search' }).fillIn(value));
  cy.do(Button('Search').click());
};

const filterOpenReceiving = () => {
  cy.do(Pane({ id:'receiving-filters-pane' }).find(Button('Order status')).click());
  cy.do(Checkbox({ id: 'clickable-filter-purchaseOrder.workflowStatus-open' }).click());
};

export default {
  searchByParameter,
  filterOpenReceiving,

  selectFromResultsList: (instanceName) => {
    cy.do(Link(instanceName).click());
  },

  receivePiece: (rowNumber, caption, barcode) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      receiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.caption` }).fillIn(caption),
      TextField({ name: `${recievingFieldName}.barcode` }).fillIn(barcode),
      receiveButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  receiveAndChangeLocation: (rowNumber, caption) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      receiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.caption` }).fillIn(caption),
      MultiColumnListRow({ indexRow: `row-${rowNumber}` }).find(Button('Assign a different location')).click(),
      Select({ name: 'institutionId' }).choose('Københavns Universitet'),
      Select({ name: 'campusId' }).choose('City Campus'),
      Button({ id: 'locationId' }).click(),
      SelectionOption('Main Library (KU/CC/DI/M) ').click(),
      receiveButton.click(),
    ]);
    // Need to wait, while data will be loaded
    cy.wait(1000);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  checkReceived: (rowNumber, caption) => {
    cy.expect(Accordion({ id: receivedPiecesAccordionId })
      .find(MultiColumnListRow({ index: rowNumber }))
      .find(MultiColumnListCell({ content: caption })).exists());
  },

  checkReceivedPiece: (rowNumber, caption, barcode) => {
    // Need to wait, while data will be loaded before start checking
    cy.wait(2000);
    cy.expect([
      Accordion({ id: receivedPiecesAccordionId })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: barcode })).exists(),
      Accordion({ id: receivedPiecesAccordionId })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: caption })).exists()
    ]);
  },

  unreceivePiece: (rowNumber = 0) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: receivedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: receivedPiecesAccordionId }).find(actionsButton).click(),
      unreceiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      unreceiveButton.click(),
    ]);
    // Need to wait, while data will be loaded
    cy.wait(1000);
    InteractorsTools.checkCalloutMessage(unreceivingSuccessful);
  },

  checkUnreceivedPiece: (rowNumber = 0, caption) => {
    // Need to wait, while data will be loaded before start checking
    cy.wait(2000);
    cy.expect(Accordion({ id: expectedPiecesAccordionId })
      .find(MultiColumnListRow({ index: rowNumber }))
      .find(MultiColumnListCell({ content: caption })).exists());
  },

  checkIsPiecesCreated:(title) => {
    filterOpenReceiving();
    cy.expect(Pane('Receiving')
      .find(MultiColumnList({ id: 'receivings-list' }))
      .find(MultiColumnListCell({ content: title }))
      .exists());
  },

  selectReceivingItem:(indexRow = 0) => {
    cy.do(MultiColumnListCell({ 'row': indexRow, 'columnIndex': 0 }).click());
  },

  selectInstanceInReceive:(instanceName) => {
    cy.do(Section({ id: 'pane-title-details' }).find(Link(instanceName)).click());
  },

  selectPOLInReceive:(POLName) => {
    cy.do(Section({ id: 'receiving-results-pane' }).find(Link(POLName)).click());
  }
};
