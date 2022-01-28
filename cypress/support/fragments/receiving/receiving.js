import {
  Button,
  Accordion,
  Checkbox,
  TextField,
  MultiColumnListRow,
  MultiColumnListCell
} from '../../../../interactors';
import Helper from '../finance/financeHelper';

const actionsButtonName = 'Actions';
const receivingSuccessful = 'Receiving successful';

export default {

  receivePiece: (rowNumber, caption, barcode) => {
    const recievingFieldName = `receivedItems[${rowNumber}]`;
    cy.expect(Accordion({ id: 'expected' }).exists());
    cy.do([
      Accordion({ id: 'expected' }).find(Button(actionsButtonName)).click(),
      Button('Receive').click(),
      Checkbox({ name: `${recievingFieldName}.checked` }).clickInput(),
      TextField({ name: `${recievingFieldName}.caption` }).fillIn(caption),
      TextField({ name: `${recievingFieldName}.barcode` }).fillIn(barcode),
      Button('Receive').click(),
    ]);
    Helper.checkCalloutMessage(receivingSuccessful, 'success');
  },

  checkReceivedPiece: (rowNumber, caption, barcode) => {
    cy.do([
      cy.expect(Accordion({ id: 'received' })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: barcode })).exists()),

      cy.expect(Accordion({ id: 'received' })
        .find(MultiColumnListRow({ index: rowNumber }))
        .find(MultiColumnListCell({ content: caption })).exists())
    ]);
  }
};
