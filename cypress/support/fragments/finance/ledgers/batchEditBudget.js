import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  HTML,
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  SearchField,
  Section,
  SelectionList,
  TextField,
} from '../../../../../interactors';

const batchAllocationButton = Button('Batch allocations');
const downloadAllocationWorksheetButton = Button('Download allocation worksheet (CSV)');
const batchAllocationModal = Modal('Select fiscal year');
const saveAndClose = Button('Save & close');
const ledgerDetailsSection = Section({ id: 'pane-ledger-details' });
const actionsButton = Button('Actions');
const searchField = SearchField({ id: 'input-record-search' });
const searchButton = Button('Search');
const resetButton = Button('Reset all');
const toggleButtonDate = Button({ id: 'accordion-toggle-button-metadata.createdDate' });
const dateAccordion = Section({ id: 'metadata.createdDate' });
const startDateField = TextField({ name: 'startDate' });
const endDateField = TextField({ name: 'endDate' });
const applyButton = Button('Apply');
const toggleButtonUser = Button({ id: 'accordion-toggle-button-metadata.createdByUserId' });
const searchButtonInModal = Button({ type: 'submit' });
const searchInput = SearchField({ id: 'input-record-search' });

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

  clickActionsButton() {
    cy.do(actionsButton.click());
  },

  clickDeleteAllocationLogs() {
    cy.do(Button('Delete selected logs').click());
  },

  clickDeleteButton() {
    cy.do(Button('Delete').click());
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
    const table = '#batch-allocation-form-content';
    const escaped = Cypress._.escapeRegExp(String(fundName));
    cy.contains(
      `${table} [role="row"] [role="gridcell"] [class^="col-xs"]`,
      new RegExp(`\\b${escaped}\\b`),
    )
      .closest('[role="row"]')
      .within(() => {
        cy.get('input[name*="budgetAllocationChange"]')
          .should('be.visible')
          .clear()
          .type(String(increaseValue), { delay: 0 });
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
            // eslint-disable-next-line cypress/no-force
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
    const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const table = '#batch-allocation-form-content';
    const rx = new RegExp(`^\\s*${escapeRx(fundName)}\\s*$`);

    return cy
      .contains(`${table} [role="row"] [role="gridcell"]:first-child .col-xs---h2D6d`, rx)
      .scrollIntoView()
      .should('be.visible')
      .closest('[role="row"]');
  },

  setFundStatus(fundName, status) {
    this.getFundRow(fundName).then(($row) => {
      const sel = $row.find('select[name*="fundStatus"]');
      cy.wrap(sel).select(status);
    });
  },

  setBudgetStatus(fundName, status) {
    this.getFundRow(fundName).find('select[name*="budgetStatus"]').should('exist').select(status);
  },

  setAllocationChange(fundName, value) {
    this.getFundRow(fundName).then(($row) => {
      const input = $row.find('input[name*="budgetAllocationChange"]');
      cy.wrap(input).clear().type(String(value), { delay: 0 });
    });
  },

  setAllowableEncumbrance(fundName, value) {
    this.getFundRow(fundName)
      .find('input[name*="budgetAllowableEncumbrance"]')
      .should('exist')
      .clear()
      .type(String(value), { delay: 0 });
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

  setTransactionDescription(fundName, text) {
    this.getFundRow(fundName).then(($row) => {
      const input = $row.find('input[name*="transactionDescription"]');
      cy.wrap(input).should('be.visible').clear().type(String(text), { delay: 0 });
    });
  },

  checkErrorMessageForNegativeEncumbranceOrExpenditure() {
    cy.get('[role="alert"]').contains('Can not be negative').should('be.visible');
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

  openBatchAllocationLogsFromLedgerList() {
    cy.do([actionsButton.click(), Button('Batch allocation logs').click()]);
  },

  assertDeleteLogsOptionDisabled() {
    cy.expect(Button('Delete selected logs').has({ disabled: true }));
  },

  selectLogWithNamePart(fyCode, ledgerCode) {
    const partialText = `${fyCode}-${ledgerCode}-`;
    const logsTable = '#batch-allocation-logs-list';

    cy.get(`${logsTable} [role="row"]`, { timeout: 10000 }).should('exist');
    cy.contains(`${logsTable} [role="row"] a`, partialText)
      .closest('[role="row"]')
      .within(() => {
        // eslint-disable-next-line cypress/no-force
        cy.get('input[type="checkbox"]')
          .should('exist')
          .and('not.be.disabled')
          .check({ force: true });
      });
  },

  searchLogs(fyCode, ledgerCode) {
    const pattern = `${fyCode}-${ledgerCode}`;
    cy.do([searchField.fillIn(pattern), searchButton.click()]);
  },

  verifyNoResultsMessage(searchRequest) {
    cy.expect(
      HTML(
        `No results found for "${searchRequest}". Please check your spelling and filters.`,
      ).exists(),
    );
  },

  resetFiltersIfActive: () => {
    cy.get('[data-testid="reset-button"]')
      .invoke('is', ':enabled')
      .then((state) => {
        if (state) {
          cy.do(resetButton.click());
          cy.wait(500);
          cy.expect(resetButton.is({ disabled: true }));
        }
      });
  },

  clickLogForLedger(fyCode, ledgerCode) {
    const partialText = `${fyCode}-${ledgerCode}-`;

    cy.contains('#batch-allocation-logs-list a[data-test-text-link]', partialText, {
      timeout: 15000,
    })
      .scrollIntoView()
      .should('be.visible')
      .click();
  },

  filterLogsByFiscalYear: (fiscalYearCode) => {
    cy.do([
      Accordion({ id: 'fiscalYearId' }).clickHeader(),
      Button({ id: 'fiscalYearId-selection' }).click(),
      SelectionList({ id: 'sl-container-fiscalYearId-selection' }).select(fiscalYearCode),
    ]);
  },

  verifyLogExists: (fiscalYearCode, ledgerCode) => {
    const needle = `${fiscalYearCode}-${ledgerCode}`;
    cy.get('#batch-allocation-logs-list [data-row-index]', { timeout: 15000 }).should(
      'have.length.greaterThan',
      0,
    );
    cy.get('#batch-allocation-logs-list [data-test-text-link]', { timeout: 15000 }).then(
      ($links) => {
        const link = [...$links].find((el) => (el.textContent || '').trim().includes(needle));
        // eslint-disable-next-line no-unused-expressions
        expect(link, `link containing "${needle}"`).to.exist;
        cy.wrap(link)
          .scrollIntoView()
          .should('be.visible')
          .closest('[data-row-index]')
          .should('contain.text', 'Completed');
      },
    );
  },

  collapseSearchPane() {
    cy.do(Button({ icon: 'caret-left' }).click());
  },

  openSearchPane() {
    cy.do(Button({ icon: 'caret-right' }).click());
  },

  filterByDate(startDate, endDate) {
    cy.do([
      toggleButtonDate.click(),
      dateAccordion.find(startDateField).fillIn(startDate),
      dateAccordion.find(endDateField).fillIn(endDate),
      dateAccordion.find(applyButton).click(),
    ]);
  },

  filterLogsByLedger: (ledgerCode) => {
    cy.do([
      Accordion({ id: 'ledgerId' }).clickHeader(),
      Button({ id: 'ledgerId-selection' }).click(),
      SelectionList({ id: 'sl-container-ledgerId-selection' }).select(ledgerCode),
    ]);
  },

  filterLogsByGroup: (groupCode) => {
    cy.do([
      Accordion({ id: 'groupId' }).clickHeader(),
      Button({ id: 'groupId-selection' }).click(),
      SelectionList({ id: 'sl-container-groupId-selection' }).select(groupCode),
    ]);
  },

  filterLogsByUser: (userName) => {
    cy.do([
      toggleButtonUser.click(),
      Button('Find User').click(),
      TextField({ name: 'query' }).fillIn(userName),
      searchButtonInModal.click(),
    ]);
    cy.wait(2000);
    cy.do(
      MultiColumnList({ id: 'list-plugin-find-user' })
        .find(MultiColumnListRow({ index: 0 }))
        .click(),
    );
  },

  searchByParameters: (parameter, value) => {
    cy.wait(4000);
    cy.do([
      searchInput.selectIndex(parameter),
      searchInput.fillIn(value),
      Button('Search').click(),
    ]);
  },

  getLogsId: (rowIndex = 0) => {
    return cy
      .get(`#batch-allocation-logs-list [data-row-index="row-${rowIndex}"] [role="gridcell"]`)
      .last()
      .invoke('text')
      .then((text) => text.trim());
  },
};
