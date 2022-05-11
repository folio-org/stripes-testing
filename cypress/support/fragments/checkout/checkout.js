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
    // TODO: investigate why "schedule-does-not-cover-the-test-date" test fails without this cy.wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3500);
    cy.do(Button({ href: `/users/${id}/loans/open` }).click());
  },
};