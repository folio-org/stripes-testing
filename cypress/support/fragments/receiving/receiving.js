import {
  Button,
  Accordion,
  Checkbox,
  TextField,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiColumnList,
  Select,
  Pane
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import TopMenu from '../topMenu';

const actionsButton = Button('Actions');
const receivingSuccessful = 'Receiving successful';
const unreceivingSuccessful = 'Unreceiving successful';
const expectedPiecesAccordionId = 'expected';
const receivedPiecesAccordionId = 'received';

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

  receivePiece: (rowNumber, caption, barcode) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: expectedPiecesAccordionId }).exists());
    cy.do([
      Accordion({ id: expectedPiecesAccordionId }).find(actionsButton).click(),
      Button('Receive').click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.caption` }).fillIn(caption),
      TextField({ name: `${recievingFieldName}.barcode` }).fillIn(barcode),
      Button('Receive').click(),
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
      Button('Unreceive').click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      Button('Unreceive').click(),
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

  checkIsPiecesCreated:(title, parameter) => {
    filterOpenReceiving();
    searchByParameter(parameter, title);
    cy.expect(Pane('Receiving')
      .find(MultiColumnList({ id: 'receivings-list' }))
      .find(MultiColumnListCell({ content: title }))
      .exists());
  }
};
