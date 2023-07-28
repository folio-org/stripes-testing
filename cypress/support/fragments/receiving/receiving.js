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
  Modal,
  PaneContent,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const actionsButton = Button('Actions');
const receivingSuccessful = 'Receiving successful';
const unreceivingSuccessful = 'Unreceiving successful';
const expectedPiecesAccordionId = 'expected';
const receivedPiecesAccordionId = 'received';
const receiveButton = Button('Receive');
const unreceiveButton = Button('Unreceive');
const addPieceModal = Modal({ id: 'add-piece-modal' });
const searchByParameter = (parameter, value) => {
  cy.do(Select({ id: 'input-record-search-qindex' }).choose(parameter));
  cy.do(TextField({ id: 'input-record-search' }).fillIn(value));
  cy.do(Button('Search').click());
};

const filterOpenReceiving = () => {
  cy.do(Pane({ id: 'receiving-filters-pane' }).find(Button('Order status')).click());
  cy.do(Checkbox({ id: 'clickable-filter-purchaseOrder.workflowStatus-open' }).click());
};

export default {
  searchByParameter,
  filterOpenReceiving,
  selectFromResultsList: (instanceName) => cy.do(Link(instanceName).click()),

  waitLoading() {
    cy.expect([
      Pane({ id: 'receiving-filters-pane' }).exists(),
      Pane({ id: 'receiving-results-pane' }).exists(),
    ]);
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

  addPiece: (caption, copyNumber, enumeration, chronology) => {
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      Button('Add piece').click(),
      addPieceModal.find(TextField('Caption')).fillIn(caption),
      addPieceModal.find(TextField('Copy number')).fillIn(copyNumber),
      addPieceModal.find(TextField('Enumeration')).fillIn(enumeration),
      addPieceModal.find(TextField('Chronology')).fillIn(chronology),
      addPieceModal.find(Checkbox('Create item')).click(),
      addPieceModal.find(Button('Save & close')).click(),
    ]);
    InteractorsTools.checkCalloutMessage('The piece was successfully saved');
  },

  addPieceProcess: (caption, enumeration) => {
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      Button('Add piece').click(),
      addPieceModal.find(TextField('Caption')).fillIn(caption),
      addPieceModal.find(TextField('Enumeration')).fillIn(enumeration),
    ]);
  },

  selectPiece: (caption) => {
    cy.do(Accordion({ id: expectedPiecesAccordionId }).find(MultiColumnListCell(caption)).click());
  },

  quickReceivePiece: (enumeration) => {
    cy.do(addPieceModal.find(Button('Quick receive')).click());
    InteractorsTools.checkCalloutMessage(`The piece ${enumeration} was successfully received`);
  },

  receivePieceWithoutBarcode: (rowNumber, caption) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      receiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.caption` }).fillIn(caption),
      receiveButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  receiveAndChangeLocation: (rowNumber, caption, institutionId) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      receiveButton.click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.caption` }).fillIn(caption),
      MultiColumnListRow({ indexRow: `row-${rowNumber}` }).find(Button('Assign a different location')).click(),
    ]);
    cy.get('form[id=location-form] select[name=institutionId]').select(institutionId);
    cy.do([
      Modal('Select permanent location').find(Button('Save and close')).click(),
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
    // eslint-disable-next-line cypress/no-unnecessary-waiting
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

  checkIsPiecesCreated: (title) => {
    filterOpenReceiving();
    cy.expect(Pane('Receiving')
      .find(MultiColumnList({ id: 'receivings-list' }))
      .find(MultiColumnListCell({ content: title }))
      .exists());
  },

  selectReceivingItem: (indexRow = 0) => {
    cy.do(MultiColumnListCell({ 'row': indexRow, 'columnIndex': 0 }).click());
  },

  selectInstanceInReceive: (instanceName) => {
    cy.do(Section({ id: 'pane-title-details' }).find(Link(instanceName)).click());
  },

  selectPOLInReceive: (POLName) => {
    cy.do(Section({ id: 'receiving-results-pane' }).find(Link(POLName)).click());
  },

  selectConnectedInEditPiece: () => {
    cy.do(Modal('Edit piece').find(Link('Connected')).click());
  },

  receiveFromExpectedSection: () => {
    cy.do([
      Section({ id: 'expected' }).find(actionsButton).click(),
      receiveButton.click()
    ]);
  },

  receiveFromExpectedSectionWithClosePOL: () => {
    cy.do([
      Section({ id: 'expected' }).find(actionsButton).click(),
      receiveButton.click(),
      Button('Continue').click()
    ]);
  },

  unreceiveFromReceivedSection: () => {
    cy.do([
      Section({ id: 'received' }).find(actionsButton).click(),
      unreceiveButton.click()
    ]);
  },

  selectFromResultsList1: () => {
    cy.do(MultiColumnList({ id: 'receivings-list' }).find(Link()).click());
  },

  receiveAll: () => {
    cy.do([
      Checkbox({ ariaLabel: 'Select all pieces' }).clickInput(),
      receiveButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },

  clickOnInstance: () => {
    cy.do([
      Button('Collapse all').click(),
      PaneContent({ id: 'pane-title-details-content' }).find(Link()).click()
    ]);
  },

  clickOnPOLnumber: (PolNumber) => {
    cy.do([
      PaneContent({ id: 'pane-title-details-content' }).find(Link(PolNumber)).click()
    ]);
  },

  quickReceivePieceAdd: () => {
    cy.do(addPieceModal.find(Button('Quick receive')).click());
  },

  receiveAllPhysicalItemsWithBarcodes: (firstBarcode, secondBarcode) => {
    cy.do([
      Checkbox({ name: 'receivedItems[0].checked' }).clickInput(),
      TextField({ name: 'receivedItems[0].barcode' }).fillIn(firstBarcode),
      Checkbox({ name: 'receivedItems[1].checked' }).clickInput(),
      TextField({ name: 'receivedItems[1].barcode' }).fillIn(secondBarcode),
      receiveButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(receivingSuccessful);
  },
};
