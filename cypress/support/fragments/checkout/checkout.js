import uuid from 'uuid';
import moment from 'moment';
import {
  TextField,
  Button,
  Pane,
  MultiColumnListRow,
  including,
  HTML
} from '../../../../interactors';
import { REQUEST_METHOD } from '../../constants';

const itemDetailsButton = Button('Item details');

export default {
  waitLoading:() => {
    cy.expect(Pane('Scan patron card').exists());
    cy.expect(Pane('Scan items').exists());
  },
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
  checkoutItemViaApi(body) {
    const checkoutId = uuid();

    return cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'circulation/check-out-by-barcode',
      body: {
        id: checkoutId,
        loanDate: moment.utc(),
        ...body,
      },
    })
      .then(checkedOutItem => {
        return checkedOutItem.body;
      });
  },

  openItemRecordInInventory:(barcode) => {
    cy.expect(MultiColumnListRow({ indexRow: 'row-0' }).find(HTML(including(barcode))).exists());
    cy.do(Button({ id: 'available-item-actions-button' }).click());
    cy.expect(itemDetailsButton.exists());
    cy.do(itemDetailsButton.click());
  }
};
