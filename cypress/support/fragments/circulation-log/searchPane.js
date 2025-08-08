import { matching } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  Dropdown,
  DropdownMenu,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  Pane,
  TextField,
  including,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import SearchResults from './searchResults';
import LoansPage from '../loans/loansPage';
import Users from '../users/users';
import ItemRecordView from '../inventory/item/itemRecordView';
import TopMenuNavigation from '../topMenuNavigation';
import { APPLICATION_NAMES } from '../../constants';

const dropdownButton = MultiColumnListRow({ rowIndexInParent: 'row-0' })
  .find(Dropdown())
  .find(Button());
const actionsButton = Button('Actions');
const servicePointField = MultiSelect({
  ariaLabelledby: 'accordion-toggle-button-servicePointId',
});

export default {
  // TODO: will rework to interactor when we get section id
  clickApplyMainFilter() {
    cy.get('[class^="button-"][type="submit"]').first().click();
  },
  waitLoading() {
    cy.expect(Accordion({ id: 'loan' }).exists());
  },

  searchByCheckedOut() {
    cy.do([
      Accordion({ id: 'loan' }).clickHeader(),
      Checkbox({ id: 'clickable-filter-loan-checked-out' }).click(),
    ]);
    cy.wait(3000);
  },

  verifyResult(content) {
    cy.expect(MultiColumnListCell(content).exists());
  },

  searchByItemBarcode(barcode) {
    cy.do(TextField({ name: 'itemBarcode' }).fillIn(barcode));
    this.clickApplyMainFilter();
    cy.wait(3000);
  },

  searchByUserBarcode(barcode) {
    cy.do(TextField({ name: 'userBarcode' }).fillIn(barcode));
    this.clickApplyMainFilter();
    cy.wait(3000);
  },

  searchByDescription(desc) {
    cy.do(TextField({ name: 'description' }).fillIn(desc));
    this.clickApplyMainFilter();
    cy.wait(3000);
  },

  searchByChangedDueDate() {
    cy.do([
      Accordion({ id: 'loan' }).clickHeader(),
      Checkbox({ id: 'clickable-filter-loan-changed-due-date' }).click(),
    ]);
    cy.wait(3000);
  },

  searchByServicePoint(servicePoint) {
    cy.do([servicePointField.fillIn(servicePoint), servicePointField.choose(servicePoint)]);
    cy.wait(3000);
  },

  searchByClaimedReturned() {
    cy.do([
      Accordion({ id: 'loan' }).clickHeader(),
      Checkbox({ id: 'clickable-filter-loan-claimed-returned' }).click(),
    ]);
    cy.wait(3000);
  },

  searchByMarkedAsMissing() {
    cy.do([
      Accordion({ id: 'loan' }).clickHeader(),
      Checkbox({ id: 'clickable-filter-loan-marked-as-missing' }).click(),
    ]);
    cy.wait(3000);
  },

  searchByLoanType(loanType) {
    cy.do([Accordion({ id: 'loan' }).clickHeader(), Checkbox(loanType).click()]);
    cy.wait(3000);
  },

  expandFeeFineAccording() {
    cy.do(Accordion({ id: 'fee' }).clickHeader());
  },

  selectOptionFromFeeFineAccordion(option) {
    cy.do(Checkbox(option).click());
  },

  setFilterOptionFromAccordion(accordion, checkboxOption) {
    // Check if it is already open
    cy.get(`#${accordion}`).then(($accordion) => {
      if (!$accordion.find('[class^="content-region"]').is(':visible')) {
        // cy.get(`#${accordion}`).click();
        cy.do(Accordion({ id: accordion }).clickHeader());
      }
    });
    // Need to avoid robotic clicks
    cy.wait(1000);
    cy.expect(
      Accordion({ id: accordion })
        .find(Checkbox({ disabled: true }))
        .absent(),
    );
    cy.do(Checkbox(checkboxOption).click());
  },

  resetFilters() {
    cy.do(Button({ id: 'reset-receiving-filters' }).click());
  },

  verifyResultCells(verifyDate = false) {
    const dateRegEx = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;

    function getResultRowByRowNumber(rowNumber) {
      return {
        userBarcode: MultiColumnListCell({
          row: rowNumber,
          columnIndex: 0,
          content: matching(/\d|/),
        }),
        itemBarcode: MultiColumnListCell({
          row: rowNumber,
          columnIndex: 1,
          content: matching(/\d|/),
        }),
        object: MultiColumnListCell({ row: rowNumber, columnIndex: 2, content: matching(/\w|-/) }),
        circAction: MultiColumnListCell({
          row: rowNumber,
          columnIndex: 3,
          content: matching(/\w/),
        }),
        date: MultiColumnListCell({ row: rowNumber, columnIndex: 4, content: matching(dateRegEx) }),
        servicePoint: MultiColumnListCell({
          row: rowNumber,
          columnIndex: 5,
          content: matching(/\w|/),
        }),
        source: MultiColumnListCell({ row: rowNumber, columnIndex: 6, content: matching(/\w|/) }),
        description: MultiColumnListCell({
          row: rowNumber,
          columnIndex: 7,
          content: matching(/\w|/),
        }),
      };
    }

    // TODO: rework with interactor (now we don't have interactor for this)
    return cy.get('#circulation-log-list').then((element) => {
      // only 30 records shows on every page
      const resultCount =
        element.attr('data-total-count') > 29 ? 29 : element.attr('data-total-count');
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

  checkResultSearch(searchResults, rowIndex = 0) {
    return cy.wrap(Object.values(searchResults)).each((contentToCheck) => {
      cy.expect(
        MultiColumnListRow({ indexRow: `row-${rowIndex}` })
          .find(MultiColumnListCell({ content: including(contentToCheck) }))
          .exists(),
      );
    });
  },

  scroll() {
    cy.get('[id^="circulation-log-list"] div.mclScrollable---JvHuN').scrollTo('right');
  },

  checkSearchResultByBarcode({ barcode, searchResults }) {
    this.searchByUserBarcode(barcode);
    this.findResultRowIndexByContent(searchResults.desc).then((rowIndex) => {
      this.checkResultSearch(searchResults, rowIndex);
    });
  },

  // TODO check if we can use it using MultiColumnRow
  findResultRowIndexByContent(content) {
    return cy
      .get('*[class^="mclCell"]')
      .contains(content)
      .parent()
      .invoke('attr', 'data-row-inner');
  },

  filterByLastWeek() {
    const lastWeek = DateTools.getLastWeekDateObj();
    const today = new Date();

    return cy.do([
      TextField({ name: 'endDate' }).fillIn(
        DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY'),
      ),
      TextField({ name: 'startDate' }).fillIn(
        DateTools.getFormattedDate({ date: lastWeek }, 'MM/DD/YYYY'),
      ),
      Accordion({ id: 'date' }).find(Button('Apply')).click(),
    ]);
  },
  resetResults() {
    cy.wait(2000);
    cy.get('button[id="reset-receiving-filters"]').then((element) => {
      const disabled = element.attr('disabled');
      if (!disabled) {
        cy.do(Button('Reset all').click());
      }
    });
    cy.wait(1000);
  },

  goToUserDetails() {
    cy.do([dropdownButton.click(), DropdownMenu().find(Button()).click()]);
  },

  userDetailIsOpen() {
    cy.expect(Pane({ id: 'pane-userdetails' }).exists());
  },

  exportResults() {
    cy.expect(MultiColumnList().exists());
    cy.do([actionsButton.click(), Button('Export results (CSV)').click()]);
  },

  checkExportResultIsUnavailable() {
    cy.do(actionsButton.click());
    cy.expect(Button('Export results (CSV)', { disabled: true }).exists());
  },

  checkActionButtonAfterFiltering(name, barcode) {
    SearchResults.chooseActionByRow(0, 'Loan details');
    LoansPage.waitLoading();
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);

    SearchResults.chooseActionByRow(0, 'User details');
    Users.verifyFirstNameOnUserDetailsPane(name);
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);

    SearchResults.clickOnCell(barcode, 0);
    ItemRecordView.waitLoading();
  },

  checkUserData(columnName, content, rowNumber) {
    cy.expect(
      MultiColumnListCell({
        row: rowNumber,
        column: columnName,
        content,
      }).exists(),
    );
  },
};
