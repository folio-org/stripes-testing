import { HTML, including } from '@interactors/html';
import { matching } from 'bigtest';
import {
  Button,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  TextField,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';

const itemBarcodeField = TextField({ name: 'item.barcode' });
const enterButton = Button({ id: 'clickable-add-item' });

const checkInAppButton = Button('Check in');
const endSessionButton = Button({ id: 'clickable-end-session-button' });

const actionsButton = Button({ id: 'available-actions-button-0' });

const loanDetailsButton = Button('Loan details');
const patronDetailsButton = Button('Patron details');
const itemDetailsButton = Button('Item details');
const newFeeFineButton = Button('New Fee/Fine');

export default {
  waitLoading() {
    cy.expect(itemBarcodeField.exists());
    cy.expect(Button('End session').exists());
  },

  openCheckInApp: () => {
    cy.do(checkInAppButton.click());
    cy.wait(1000);
  },

  enterItemBarcode(barcode) {
    cy.do([itemBarcodeField.fillIn(barcode), enterButton.click()]);
  },

  checkActionsMenuOptions() {
    cy.expect(actionsButton.exists());
    cy.do(actionsButton.click());
    cy.expect([
      loanDetailsButton.exists(),
      patronDetailsButton.exists(),
      itemDetailsButton.exists(),
      newFeeFineButton.exists(),
    ]);
    cy.do(actionsButton.click());
  },

  openLoanDetails(username) {
    cy.do([actionsButton.click(), loanDetailsButton.click()]);
    cy.expect(Pane(including(username)).exists());
    cy.expect(Pane(including('Loan details')).exists());
  },

  openPatronDetails(username) {
    cy.do([actionsButton.click(), patronDetailsButton.click()]);
    cy.expect(Pane({ title: including(username) }).exists());
  },

  openItemDetails(itemBarcode) {
    cy.do([actionsButton.click(), itemDetailsButton.click()]);
    cy.expect(Pane(including(itemBarcode)).exists());
  },

  openNewFeeFinesPane() {
    cy.do([actionsButton.click(), newFeeFineButton.click()]);
    cy.expect(Modal(including('New fee/fine')).exists());
  },

  closeNewFeeFinesPane() {
    cy.do(Button({ id: 'cancelCharge' }).click());
  },

  endSession() {
    cy.do(endSessionButton.click());
  },

  verifyResultCells(verifyDate = false) {
    const dateRegEx = /\d{1,2}:\d{2}\s\w{2}/gm;

    function getResultRowByRowNumber(rowNumber) {
      return {
        '#list-column-timereturned': MultiColumnListCell({
          row: rowNumber,
          columnIndex: 0,
          content: matching(dateRegEx),
        }),
        '#list-column-title': MultiColumnListCell({
          row: rowNumber,
          columnIndex: 1,
          content: matching(/((\d|\w)\s*)/),
        }),
        '#list-column-barcode': MultiColumnListCell({
          row: rowNumber,
          columnIndex: 2,
          content: matching(/\d|-/),
        }),
        '#list-column-effectivecallnumber': MultiColumnListCell({
          row: rowNumber,
          columnIndex: 3,
          content: matching(/\w|/),
        }),
        '#list-column-location': MultiColumnListCell({
          row: rowNumber,
          columnIndex: 4,
          content: matching(/\w/),
        }),
        '#list-column-inhouseuse': MultiColumnListCell({
          row: rowNumber,
          columnIndex: 5,
          content: matching(/\w|/),
        }),
        '#list-column-status': MultiColumnListCell({
          row: rowNumber,
          columnIndex: 6,
          content: matching(/\w\s*-*\d*/),
        }),
      };
    }

    // TODO: rework with interactor (now we don't have interactor for this)
    return cy.get('#list-items-checked-in').then((element) => {
      // only 30 records shows on every page
      const resultCount =
        element.attr('aria-rowcount') > 29 ? 29 : element.attr('aria-rowcount') - 1;

      // verify every string in result table
      for (let i = 0; i < resultCount; i++) {
        const resultRow = getResultRowByRowNumber(i);

        // eslint-disable-next-line guard-for-in
        for (const prop in resultRow) {
          cy.expect(resultRow[prop].exists());
        }

        if (verifyDate) {
          cy.do(
            resultRow.date.perform((el) => {
              const actualDate = new Date(el.textContent);
              const lastWeek = DateTools.getLastWeekDateObj();
              const today = new Date();

              const isActualDateCorrect = lastWeek <= actualDate <= today;
              // eslint-disable-next-line no-unused-expressions
              expect(isActualDateCorrect).to.be.true;
            }),
          );
        }
      }
    });
  },

  checkResultsInTheRow(allContentToCheck, rowNumber = 0) {
    this.verifyResultCells();
    allContentToCheck.forEach((contentToCheck) => cy.expect(
      MultiColumnListCell({
        row: rowNumber,
        content: contentToCheck,
      }).exists(),
    ));
  },

  checkItemIsNotCheckedIn(itemBarcode) {
    cy.expect([
      MultiColumnListRow(including(itemBarcode)).absent(),
      HTML(including('No items have been entered yet')),
    ]);
  },

  checkInHouseUseIcon(exists = true, rowNumber = 0) {
    if (exists) {
      cy.expect(
        MultiColumnListCell({ row: rowNumber, column: 'In-house use' })
          .find(HTML({ className: including('icon-') }))
          .exists(),
      );
    } else {
      cy.expect(
        MultiColumnListCell({ row: rowNumber, column: 'In-house use' })
          .find(HTML({ className: including('icon-') }))
          .absent(),
      );
    }
  },
};
