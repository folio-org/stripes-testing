import {
  TextField,
  Button,
} from '../../../../interactors';

export default {
  fillUserBarcode(barcode) {
    cy.do([
      TextField({ id: 'input-patron-identifier' }).fillIn(barcode),
      Button({ id: 'clickable-find-patron' }).click(),
    ]);
  },
  checkUserOpenLoans({ barcode, id }) {
    this.fillUserBarcode(barcode);
    cy.wait(5000);
    cy.do(Button({ href: `/users/${id}/loans/open` }).click());
  },
};
