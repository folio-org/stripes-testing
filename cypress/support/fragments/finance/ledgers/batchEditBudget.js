import { including } from '@interactors/html';
import { Button, Modal, Section, SelectionList } from '../../../../../interactors';

const batchAllocationButton = Button('Batch allocations');
const downloadAllocationWorksheetButton = Button('Download allocation worksheet (CSV)');
const batchAllocationModal = Modal('Select fiscal year');
const saveAndClose = Button('Save & close');
const ledgerDetailsSection = Section({ id: 'pane-ledger-details' });
const actionsButton = Button('Actions');

export default {
  clickBatchAllocationButton() {
    cy.do([ledgerDetailsSection.find(actionsButton).click(), batchAllocationButton.click()]);
  },

  cancelBatchAllocation() {
    cy.do(batchAllocationModal.find(Button('Cancel')).click());
  },

  cancelBatchEditBudget() {
    cy.do(Button('Cancel').click());
  },

  closeWithoutSavingBatchEditBudget() {
    cy.do(Button('Close without saving').click());
  },

  clickDownloadAllocationWorksheet() {
    cy.do([
      ledgerDetailsSection.find(actionsButton).click(),
      downloadAllocationWorksheetButton.click(),
    ]);
  },

  clickConfirmButton() {
    cy.do(Button('Confirm').click());
  },

  clickRecalculateButton() {
    cy.do(Button('Recalculate').click());
  },

  clickSaveAndCloseButton() {
    cy.do(Button('Save & close').click());
  },

  selectFiscalYearInConfirmModal(fiscalYear) {
    const modal = '[id^="confirmation-"][id$="-content"]';
    const openBtn = `${modal} button[id^="selection-"]:visible`;
    const filterInput = 'input[role="combobox"][aria-autocomplete="list"]:visible';
    const options = 'ul[role="listbox"] li[role="option"]';

    cy.get(openBtn, { timeout: 8000 }).first().click();
    cy.get(filterInput, { timeout: 8000 }).clear().type(fiscalYear.code, { delay: 0 });
    cy.get(options, { timeout: 8000 })
      .contains(new RegExp(`^${fiscalYear.code}$`))
      .click();
    cy.get(openBtn).should('contain', fiscalYear.code);
  },

  searchFiscalYearInBatchAllocation(fiscalYear) {
    cy.get('button[id^="selection-"]', { timeout: 5000 }).click();
    cy.get('input[role="combobox"][aria-autocomplete="list"]', { timeout: 5000 })
      .filter(':visible')
      .first()
      .clear()
      .type(fiscalYear.code, { delay: 0 });
  },

  selectFiscalYearInBatchAllocation(fiscalYear) {
    cy.then(() => {
      return cy.do(SelectionList().select(including(fiscalYear.code)));
    }).then(
      () => {},
      () => {
        cy.get('ul[role="listbox"] li[role="option"]').contains(fiscalYear.code).click();
      },
    );
  },

  expectEmptySelectionList() {
    cy.get('ul[role="listbox"][id$="-menu"]', { timeout: 8000 })
      .filter(':visible')
      .first()
      .should('be.visible')
      .within(() => {
        cy.get('[role="option"]').should('have.length', 1);
        cy.get('[role="option"] span').should('have.text', '-List is empty-');
      });
  },

  saveAndCloseBatchAllocation() {
    cy.do(batchAllocationModal.find(saveAndClose).click());
  },

  verifyBatchEditBudget(expectedFunds) {
    cy.get('#batch-allocation-form-content').should('exist');

    cy.get('#batch-allocation-form-content')
      .find('div[role="row"]')
      .then(($rows) => {
        const dataRows = $rows.toArray().filter((r) => {
          const idx = r.getAttribute('aria-rowindex');
          return idx && Number(idx) > 1;
        });
        expect(dataRows.length, 'row count').to.equal(expectedFunds.length);
        expectedFunds.forEach((ef, idx) => {
          const row = dataRows[idx];
          const $row = Cypress.$(row);

          // 1) Fund name
          const fundNameCell = $row.find('div[role="gridcell"]').eq(0).text().trim();
          expect(fundNameCell, `Fund name in row ${idx}`).to.equal(ef.fundName);

          // 2) Fund status
          const $statusSelect = $row.find('div[role="gridcell"]').eq(1).find('select');
          let statusText = '';
          if ($statusSelect.length) {
            statusText = $statusSelect.find('option:selected').text().trim();
          } else {
            statusText = $row.find('div[role="gridcell"]').eq(1).text().trim();
          }
          if (ef.fundStatus != null) {
            expect(statusText, `Fund status in row ${idx}`).to.equal(ef.fundStatus);
          } else {
            // eslint-disable-next-line no-unused-expressions
            expect(statusText === '' || statusText === '-' || statusText == null).to.be.true;
          }

          // 3) Budget Name
          const budgetNameCell = $row.find('div[role="gridcell"]').eq(2).text().trim();
          if (ef.budgetName != null) {
            expect(budgetNameCell).to.equal(ef.budgetName);
          } else {
            // eslint-disable-next-line no-unused-expressions
            expect(budgetNameCell === '' || budgetNameCell === '-' || budgetNameCell == null).to.be
              .true;
          }

          // 4) Total allocated (before)
          const allocBeforeCell = $row.find('div[role="gridcell"]').eq(3).text().trim();
          expect(allocBeforeCell, `Total allocated (before) in row ${idx}`).to.equal(
            ef.allocatedBefore,
          );
        });
      });
  },

  verifySortingByColumn(columnHeaderText, colIndex) {
    const tableSelector = '#batch-allocation-form-content';
    const getColumnValues = () => {
      return cy
        .get(`${tableSelector} div[role="row"]`)
        .filter((i, r) => {
          const aria = r.getAttribute('aria-rowindex');
          return aria && Number(aria) > 1;
        })
        .then(($rows) => {
          return Cypress.$.makeArray($rows).map((r) => {
            return Cypress.$(r).find('div[role="gridcell"]').eq(colIndex).text()
              .trim();
          });
        });
    };

    cy.get(`${tableSelector} div[role="columnheader"]`)
      .contains(columnHeaderText)
      .invoke('closest', 'div[role="columnheader"]')
      .then((headerDiv) => {
        const $header = Cypress.$(headerDiv);
        const sortAttr = $header.attr('aria-sort');
        const sortButton = $header.find('[role="button"], button');
        expect(sortButton.length, `sort button for ${columnHeaderText}`).to.be.greaterThan(0);

        getColumnValues().then((initialVals) => {
          const sortedAsc = [...initialVals].sort((a, b) => a.localeCompare(b));
          const sortedDesc = [...initialVals].sort((a, b) => b.localeCompare(a));

          const clickAndWait = (expectedSortValue) => {
            cy.wrap(sortButton).click();
            cy.wait(4000);
            cy.wrap(headerDiv).should('have.attr', 'aria-sort', expectedSortValue);
          };

          if (sortAttr === 'descending') {
            clickAndWait('ascending');
            getColumnValues().then((vals) => {
              expect(vals, `${columnHeaderText} ascending`).to.deep.equal(sortedAsc);
            });
            clickAndWait('descending');
            getColumnValues().then((vals) => {
              expect(vals, `${columnHeaderText} descending`).to.deep.equal(sortedDesc);
            });
          } else if (sortAttr === 'ascending') {
            clickAndWait('descending');
            getColumnValues().then((vals) => {
              expect(vals, `${columnHeaderText} descending`).to.deep.equal(sortedDesc);
            });
            clickAndWait('ascending');
            getColumnValues().then((vals) => {
              expect(vals, `${columnHeaderText} ascending`).to.deep.equal(sortedAsc);
            });
          } else {
            clickAndWait('ascending');
            getColumnValues().then((vals) => {
              expect(vals, `${columnHeaderText} ascending`).to.deep.equal(sortedAsc);
            });
            clickAndWait('descending');
            getColumnValues().then((vals) => {
              expect(vals, `${columnHeaderText} descending`).to.deep.equal(sortedDesc);
            });
          }
        });
      });
  },

  increaseAllocationForFund(fundName, increaseValue) {
    const tableSelector = '#batch-allocation-form-content';
    cy.get(`${tableSelector} div[role="row"]`)
      .filter((i, r) => {
        const aria = r.getAttribute('aria-rowindex');
        return aria && Number(aria) > 1;
      })
      .then(($rows) => {
        const targetRow = [...$rows].find((r) => {
          const text = Cypress.$(r).find('div[role="gridcell"]').eq(0).text()
            .trim();
          return text === fundName;
        });
        // eslint-disable-next-line no-unused-expressions
        expect(targetRow, `row for fund ${fundName}`).to.exist;
        const $row = Cypress.$(targetRow);
        const $cell = $row.find('div[role="gridcell"]').filter((i, c) => {
          return Cypress.$(c).find('input[name*="budgetAllocationChange"]').length > 0;
        });
        expect($cell.length, `allocation change cell in row ${fundName}`).to.be.greaterThan(0);
        const $input = $cell.find('input[name*="budgetAllocationChange"]');
        expect($input.length, `input for allocation change for ${fundName}`).to.be.greaterThan(0);
        cy.wrap($input).clear().type(String(increaseValue), { delay: 0 });
      });
  },

  assertSortingAvailability(columnHeaderText, colIndex, shouldBeEnabled) {
    const tableSelector = '#batch-allocation-form-content';
    const getColumnValues = () => {
      return cy
        .get(`${tableSelector} div[role="row"]`)
        .filter((i, r) => {
          const aria = r.getAttribute('aria-rowindex');
          return aria && Number(aria) > 1;
        })
        .then(($rows) => {
          return Cypress.$.makeArray($rows).map((r) => {
            return Cypress.$(r).find('div[role="gridcell"]').eq(colIndex).text()
              .trim();
          });
        });
    };

    cy.get(`${tableSelector} div[role="columnheader"]`)
      .contains(columnHeaderText)
      .closest('div[role="columnheader"]')
      .then(($header) => {
        const $sortControls = $header.find('[role="button"], button');
        expect($sortControls.length, `sort controls for ${columnHeaderText}`).to.be.greaterThan(0);

        getColumnValues().then((initialVals) => {
          if (shouldBeEnabled) {
            cy.wrap($sortControls).first().click();
            cy.wait(200);
            getColumnValues().then((afterVals) => {
              expect(afterVals, `${columnHeaderText} should change on sort`).to.not.deep.equal(
                initialVals,
              );
            });
          } else {
            cy.wrap($sortControls).first().click({ force: true });
            cy.wait(200);
            getColumnValues().then((afterVals) => {
              expect(
                afterVals,
                `${columnHeaderText} should NOT change when sort disabled`,
              ).to.deep.equal(initialVals);
            });
          }
        });
      });
  },

  getFundRow(fundName) {
    return cy
      .get('#batch-allocation-form-content div[role="row"]')
      .filter((i, r) => {
        const aria = r.getAttribute('aria-rowindex');
        return aria && Number(aria) > 1;
      })
      .then(($rows) => {
        const found = Cypress.$.makeArray($rows).find((r) => {
          const nameCell = Cypress.$(r).find('div[role="gridcell"]').eq(0);
          return nameCell.text().trim() === fundName;
        });
        return cy.wrap(found);
      });
  },

  setFundStatus(fundName, status) {
    this.getFundRow(fundName).then(($row) => {
      const sel = $row.find('select[name*="fundStatus"]');
      cy.wrap(sel).select(status);
    });
  },

  setBudgetStatus(fundName, status) {
    this.getFundRow(fundName).then(($row) => {
      const sel = $row.find('select[name*="budgetStatus"]');
      cy.wrap(sel).select(status);
    });
  },

  setAllocationChange(fundName, value) {
    this.getFundRow(fundName).then(($row) => {
      const input = $row.find('input[name*="budgetAllocationChange"]');
      cy.wrap(input).clear().type(String(value), { delay: 0 });
    });
  },

  setAllowableEncumbrance(fundName, value) {
    this.getFundRow(fundName).then(($row) => {
      const input = $row.find('input[name*="budgetAllowableEncumbrance"]');
      cy.wrap(input).clear().type(String(value), { delay: 0 });
    });
  },

  setAllowableExpenditure(fundName, value) {
    this.getFundRow(fundName).then(($row) => {
      const input = $row.find('input[name*="budgetAllowableExpenditure"]');
      cy.wrap(input).clear().type(String(value), { delay: 0 });
    });
  },

  addTransactionTags(fundName, tags = []) {
    this.getFundRow(fundName).then(($row) => {
      const cell = $row.find('div[role="gridcell"]').filter((i, c) => {
        return Cypress.$(c).find('input[role="combobox"]').length > 0;
      });
      const combo = cell.find('input[role="combobox"]');
      tags.forEach((tag) => {
        cy.wrap(combo).type(tag + '{enter}', { delay: 0 });
      });
    });
  },

  checkErrorMessageForNegativeAllocation() {
    cy.get('[role="alert"]')
      .contains('New total allocation cannot be negative')
      .should('be.visible');
  },

  assertTotalAllocatedAfter(fundName, expected, opts = {}) {
    const { tolerance = 0 } = opts;

    const toNum = (v) => {
      if (v == null) return NaN;
      const s = String(v).replace(/\s+/g, '').replace(',', '.');
      return Number(s);
    };

    this.getFundRow(fundName).then(($row) => {
      const $input = $row.find(
        'input[name*="calculatedFinanceData"][name*="budgetAfterAllocation"]',
      );
      cy.wrap($input).should('be.disabled');

      cy.wrap($input)
        .invoke('val')
        .then((val) => {
          if (expected instanceof RegExp) {
            expect(String(val), `after-allocation (text) for "${fundName}"`).to.match(expected);
          } else if (typeof expected === 'number' || typeof expected === 'string') {
            const actual = toNum(val);
            const exp = toNum(expected);
            expect(
              Math.abs(actual - exp),
              `after-allocation (number) for "${fundName}" — expected ${exp} ±${tolerance}, got ${actual}`,
            ).to.be.at.most(tolerance);
          }
        });
    });
  },
};
