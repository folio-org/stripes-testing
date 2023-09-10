import { matching } from 'bigtest';
import { MultiColumnListCell } from '../../../../interactors';
import DateTools from '../../utils/dateTools';

export default {
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
    allContentToCheck.forEach((contentToCheck) => cy.expect(MultiColumnListCell({ row: rowNumber, content: contentToCheck }).exists()));
  },
};
