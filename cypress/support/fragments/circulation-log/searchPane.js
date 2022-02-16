import { matching } from 'bigtest';
import { Accordion, Button, MultiColumnListCell, TextField } from '../../../../interactors';
import DateTools from '../../utils/dateTools';


export default {
  searchByItemBarcode(barcode) {
    return cy.do([
      TextField({ name: 'itemBarcode' }).fillIn(barcode),
      Accordion({ id: 'accordion_5' }).find(Button('Apply')).click()
    ]);
  },

  resetFilters() {
    cy.do(Button({ id: 'reset-receiving-filters' }).click());
  },

  verifyResultCells(verifyDate = false) {
    const dateRegEx = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;

    function getResultRowByRowNumber(rowNumber) {
      return {
        userBarcode: MultiColumnListCell({ row: rowNumber, columnIndex: 0, column: matching(/\d|/) }),
        itemBarcode: MultiColumnListCell({ row: rowNumber, columnIndex: 1, column: matching(/\d|/) }),
        object: MultiColumnListCell({ row: rowNumber, columnIndex: 2, column: matching(/\w|-/) }),
        circAction: MultiColumnListCell({ row: rowNumber, columnIndex: 3, column: matching(/\w/) }),
        date: MultiColumnListCell({ row: rowNumber, columnIndex: 4, column: matching(dateRegEx) }),
        servicePoint: MultiColumnListCell({ row: rowNumber, columnIndex: 5, column: matching(/\w|/) }),
        source: MultiColumnListCell({ row: rowNumber, columnIndex: 6, column: matching(/\w/) }),
        description: MultiColumnListCell({ row: rowNumber, columnIndex: 7, column: matching(/\w/) })
      };
    }

    // TODO: rework with interactor (now we don't have interactor for this)
    return cy.get('#circulation-log-list').then(element => {
      // only 30 records shows on every page
      const resultCount = element.attr('data-total-count') > 29 ? 29 : element.attr('data-total-count');

      // verify every string in result table
      for (let i = 0; i < resultCount; i++) {
        const resultRow = getResultRowByRowNumber(i);

        // eslint-disable-next-line guard-for-in
        for (const prop in resultRow) {
          cy.expect(resultRow[prop].exists());
        }

        if (verifyDate) {
          cy.do(
            resultRow.date.perform(el => {
              const actualDate = new Date(el.textContent);
              const lastWeek = DateTools.getLastWeekDateObj();
              const today = new Date();

              const isActualDateCorrect = lastWeek <= actualDate <= today;
              expect(isActualDateCorrect).to.be.true;
            })
          );
        }
      }
    });
  },

  filterByLastWeek() {
    const lastWeek = DateTools.getLastWeekDateObj();
    const today = new Date();

    return cy.do([
      TextField({ name: 'endDate' }).fillIn(DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY')),
      TextField({ name: 'startDate' }).fillIn(DateTools.getFormattedDate({ date: lastWeek }, 'MM/DD/YYYY')),
      Accordion({ id: 'date' }).find(Button('Apply')).click()
    ]);
  },
};
