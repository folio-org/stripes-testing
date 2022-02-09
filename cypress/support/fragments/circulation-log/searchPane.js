import { Accordion, Button, Checkbox, MultiColumnListCell, TextField } from '../../../../interactors';


const loanTab = Accordion({ id: 'loan' });

export default {

  searchByLoan() {
    return cy.do([
      loanTab.clickHeader(),
      loanTab.find(Checkbox({ label: 'Changed due date' })).click()
    ]);
  },

  searchByItemBarcode(barcode) {
    return cy.do([
      TextField({ name: 'itemBarcode' }).fillIn(barcode),
      Accordion({ id: 'accordion_5' }).find(Button('Apply')).click()
    ]);
  },

  resetFilters() {
    cy.do(Button({ id: 'reset-receiving-filters' }).click());
  },

  verifyResultCells() {
    function getResultRowByRowNumber(rowNumber) {
      return {
        userBarcode: MultiColumnListCell({ row: rowNumber, columnIndex: 0 }),
        itemBarcode: MultiColumnListCell({ row: rowNumber, columnIndex: 1 }),
        object: MultiColumnListCell({ row: rowNumber, columnIndex: 2 }),
        circAction: MultiColumnListCell({ row: rowNumber, columnIndex: 3 }),
        date: MultiColumnListCell({ row: rowNumber, columnIndex: 4 }),
        servicePoint: MultiColumnListCell({ row: rowNumber, columnIndex: 5 }),
        source: MultiColumnListCell({ row: rowNumber, columnIndex: 6 }),
        description: MultiColumnListCell({ row: rowNumber, columnIndex: 7 })
      };
    }

    const dateRegEx = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;

    return cy.get('#circulation-log-list').then(element => {
      const resultCount = element.attr('data-total-count');

      // verify every string in result table
      for (let i = 0; i < resultCount; i++) {
        const resultRow = getResultRowByRowNumber(i);
        cy.do([
          resultRow.userBarcode.perform(el => expect(el.textContent).to.match(/\d/)),
          resultRow.itemBarcode.perform(el => expect(el.textContent).to.match(/\d/)),
          resultRow.object.perform(el => expect(el.textContent).to.match(/\w/)),
          resultRow.circAction.perform(el => expect(el.textContent).to.match(/\w/)),
          resultRow.date.perform(el => expect(el.textContent).to.match(dateRegEx)),
          resultRow.servicePoint.perform(el => expect(el.textContent).to.match(/\w/)),
          resultRow.source.perform(el => expect(el.textContent).to.match(/\w/)),
          resultRow.description.perform(el => expect(el.textContent).to.match(/\w/))
        ]);
      }
    });
  }
};
