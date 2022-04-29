import {
  Button,
  Accordion,
  Checkbox,
  TextField,
  MultiColumnListRow,
  MultiColumnListCell,
  SearchField
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const actionsButton = Button('Actions');
const receivingSuccessful = 'Receiving successful';
const unreceivingSuccessful = 'Unreceiving successful';
const expectedPiecesAccordionId = 'expected';
const receivedPiecesAccordionId = 'received';
const receiveButton = Button('Receive');
const unreceiveButton = Button('Unreceive');

export default {

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

  checkReceivedPiece: (rowNumber, caption, barcode) => {
    cy.do([
      cy.expect(Accordion({ id: receivedPiecesAccordionId })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: barcode })).exists()),

      cy.expect(Accordion({ id: receivedPiecesAccordionId })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: caption })).exists())
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
    InteractorsTools.checkCalloutMessage(unreceivingSuccessful);
  },

  checkUnreceivedPiece: (rowNumber = 0, caption) => {
    cy.do([
      cy.expect(Accordion({ id: expectedPiecesAccordionId })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: caption })).exists())
    ]);
  },

  searchByParameter:(parameter, value) => {
    cy.do([
      SearchField({ id: 'input-record-search-qindex' }).selectIndex(parameter),
      SearchField({ id: 'input-record-search' }).fillIn(value),
      Button('Search').click(),
    ]);
  },

  selectReceivingItem:(indexRow = 0) => {
    cy.do(MultiColumnListCell({ 'row': indexRow, 'columnIndex': 0 }).click());
  }
};
