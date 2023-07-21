import { Button, Checkbox, Modal, TextField } from '../../../interactors';

const checkOut = TextField({ id: 'input-patron-identifier' });
const itembarcode = TextField({ id: 'input-item-barcode' });
const PatronButton = Button({ id: 'clickable-find-patron' });
const ItemButton = Button({ id: 'clickable-add-item' });
export default {
  clickonitem() {
    cy.do(items).click();
  },

  enterpatronBardcodeCheckout: (patronbarcode) => {
    cy.do([checkOut.fillIn(patronbarcode),
      PatronButton.click(),
      Modal('Patron blocked from borrowing').find(Button('Close')).click()]);
  },
  enteritemBardcodeCheckout: (searchitembarcode) => {
    cy.do([itembarcode.fillIn(searchitembarcode), ItemButton.click(),
      Modal('Patron blocked from borrowing').find(Button('Close')).click()]);
  },

  selectRenewed: () => {
    cy.expect(Pane({ title: 'Circulation log' }).exists());
    cy.do([
      Accordion({ id: 'loan' }).clickHeader(),
      Checkbox({
        id: 'clickable-filter-loan-renewed-through-override',
      }).click(),
    ]);
  },
};
