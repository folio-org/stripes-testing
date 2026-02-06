import {
  Button,
  HTML,
  Modal,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelectMenu,
  MultiSelectOption,
  TextField,
  including,
  Select,
  not,
  Accordion,
  Checkbox,
  SearchField,
  MultiSelect,
  matching,
} from '../../../../../interactors';
import { DEFAULT_WAIT_TIME, INVENTORY_COLUMN_HEADERS } from '../../../constants';
import ChangeInstanceModal from './changeInstanceModal';

const selectInstanceModal = Modal('Select instance');
const searchInput = selectInstanceModal.find(TextField({ name: 'query' }));
const searchButton = selectInstanceModal.find(Button('Search'));
const resetAllButton = selectInstanceModal.find(Button('Reset all'));
const closeButton = selectInstanceModal.find(Button('Close'));
const holdingsToggleButton = Button('Holdings');
const itemToggleButton = Button('Item');
const resultsList = selectInstanceModal.find(HTML({ id: 'list-plugin-find-records' }));
const searchOptionSelect = Select('Search field index');
const defaultSearchOption = including('Keyword (title, contributor, identifier, HRID, UUID');
const dateCreatedErrorMessage = 'Please enter a valid date';
const dateRangeErrorMessage = 'Please enter a valid year';
const sourceAccordion = selectInstanceModal.find(Accordion('Source'));
const startDateField = TextField({ name: 'startDate' });
const endDateField = TextField({ name: 'endDate' });
const clearIcon = Button({ icon: 'times-circle-solid' });
const searchInstancesOptions = [
  'Keyword (title, contributor, identifier, HRID, UUID)',
  'Contributor',
  'Title (all)',
  'Identifier (all)',
  'Classification, normalized',
  'ISBN',
  'ISSN',
  'LCCN, normalized',
  'OCLC number, normalized',
  'Instance notes (all)',
  'Instance administrative notes',
  'Place of publication',
  'Subject',
  'Instance HRID',
  'Instance UUID',
  'Authority UUID',
  'All',
  'Query search',
];
const searchHoldingsOptions = [
  'Keyword (title, contributor, identifier, HRID, UUID)',
  'ISBN',
  'ISSN',
  'Call number, not normalized',
  'Call number, normalized',
  'Holdings notes (all)',
  'Holdings administrative notes',
  'Holdings HRID',
  'Holdings UUID',
  'All',
  'Query search',
];
const searchItemsOptions = [
  'Keyword (title, contributor, identifier, HRID, UUID, barcode)',
  'Barcode',
  'ISBN',
  'ISSN',
  'Effective call number (item), not normalized',
  'Effective call number (item), normalized',
  'Item notes (all)',
  'Item administrative notes',
  'Circulation notes',
  'Item HRID',
  'Item UUID',
  'All',
  'Query search',
];
export const COLUMN_HEADERS = [
  INVENTORY_COLUMN_HEADERS.TITLE,
  INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
  INVENTORY_COLUMN_HEADERS.PUBLISHERS,
  INVENTORY_COLUMN_HEADERS.DATE,
  INVENTORY_COLUMN_HEADERS.INSTANCE_HRID,
];

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(selectInstanceModal.exists());
  },
  verifyModalView() {
    cy.expect([
      searchButton.has({ disabled: true, visible: true }),
      resetAllButton.has({ disabled: true, visible: true }),
      closeButton.has({ disabled: false, visible: true }),
    ]);

    this.checkTableContent();
  },
  checkTableContent({ records = [] } = {}) {
    records.forEach((record, index) => {
      if (record.title) {
        cy.expect(
          resultsList
            .find(MultiColumnListCell({ row: index, column: 'Title' }))
            .has({ content: including(record.title) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(
        selectInstanceModal
          .find(HTML({ className: including('noResultsMessage-') }))
          .has({ text: 'Choose a filter or enter a search query to show results.' }),
      );
    }
  },
  searchByName(instanceTitle) {
    cy.do([searchInput.fillIn(instanceTitle), searchButton.click()]);
    cy.expect(
      selectInstanceModal.find(HTML(including('Enter search criteria to start search'))).absent(),
    );
  },
  searchByParameter: (parameter, value) => {
    cy.do([
      SearchField('Search field index').selectIndex(parameter),
      searchInput.fillIn(value),
      cy.wait(500),
      searchButton.focus(),
      cy.wait(500),
      searchButton.click(),
      cy.wait(1000),
    ]);
  },
  selectInstance({ shouldConfirm = false } = {}) {
    cy.do(selectInstanceModal.find(MultiColumnListRow({ index: 0 })).click());
    cy.expect(selectInstanceModal.absent());

    if (shouldConfirm) {
      ChangeInstanceModal.verifyModalView();
    }
  },
  clickSearchButton() {
    cy.expect(searchButton.has({ disabled: false }));
    cy.do(searchButton.click());
  },
  clickResetAllButton() {
    cy.expect(resetAllButton.has({ disabled: false }));
    cy.do(resetAllButton.click());
  },
  clickCloseButton() {
    cy.expect(closeButton.has({ disabled: false }));
    cy.do(closeButton.click());
    cy.expect(selectInstanceModal.absent());
  },
  clickSearchOptionSelect() {
    cy.do(searchOptionSelect.click());
  },
  chooseSearchOption(searchOption) {
    cy.do(searchOptionSelect.choose(searchOption));
  },
  checkSearchOptionIncluded(searchOption, optionShown = true) {
    if (optionShown) cy.expect(searchOptionSelect.has({ content: including(searchOption) }));
    else cy.expect(searchOptionSelect.has({ content: not(including(searchOption)) }));
  },
  checkDefaultSearchOptionSelected() {
    cy.expect(searchOptionSelect.has({ checkedOptionText: defaultSearchOption }));
  },
  checkSearchOptionSelected(searchOption) {
    cy.expect(searchOptionSelect.has({ checkedOptionText: searchOption }));
  },
  checkSearchInputFieldValue(query) {
    cy.expect(searchInput.has({ value: query }));
  },
  checkResultsListEmpty(isEmpty = true) {
    if (isEmpty) cy.expect(resultsList.absent());
    else cy.expect(resultsList.exists());
  },
  checkNoRecordsFound(headingReference) {
    cy.expect(
      selectInstanceModal
        .find(
          HTML(
            `No results found for "${headingReference}". Please check your spelling and filters.`,
          ),
        )
        .exists(),
    );
  },
  verifyInstanceSearchOptionsInOrder() {
    cy.wrap(searchOptionSelect.allOptionsText()).should((arrayOfOptions) => {
      expect(arrayOfOptions).to.deep.equal(Object.values(searchInstancesOptions));
    });
  },
  verifyHoldingsSearchOptionsInOrder() {
    cy.wrap(searchOptionSelect.allOptionsText()).should((arrayOfOptions) => {
      expect(arrayOfOptions).to.deep.equal(Object.values(searchHoldingsOptions));
    });
  },
  verifyItemSearchOptionsInOrder() {
    cy.wrap(searchOptionSelect.allOptionsText()).should((arrayOfOptions) => {
      expect(arrayOfOptions).to.deep.equal(Object.values(searchItemsOptions));
    });
  },
  switchToHoldings: () => cy.do(holdingsToggleButton.click()),
  switchToItem: () => cy.do(itemToggleButton.click()),

  expandSelectInstanceAccordion(accordion) {
    cy.do(selectInstanceModal.find(Accordion(accordion)).clickHeader());
  },
  fillDateFields(accordionName, fromDate, toDate) {
    cy.do([
      selectInstanceModal.find(Accordion(accordionName)).find(startDateField).fillIn(fromDate),
      selectInstanceModal.find(Accordion(accordionName)).find(endDateField).fillIn(toDate),
    ]);
  },
  verifyDateFieldErrorMessages() {
    cy.expect(
      selectInstanceModal
        .find(Accordion('Date created'))
        .find(HTML(including(dateCreatedErrorMessage)))
        .exists(),
    );
    cy.expect(
      selectInstanceModal
        .find(Accordion('Date updated'))
        .find(HTML(including(dateCreatedErrorMessage)))
        .exists(),
    );
    cy.expect(
      selectInstanceModal
        .find(Accordion('Date range'))
        .find(HTML(including(dateRangeErrorMessage)))
        .exists(),
    );
  },
  verifyDateFieldsCleared() {
    const accordions = ['Date range', 'Date created', 'Date updated'];
    accordions.forEach((accordionName) => {
      cy.expect([
        selectInstanceModal.find(Accordion(accordionName)).find(startDateField).has({ value: '' }),
        selectInstanceModal.find(Accordion(accordionName)).find(endDateField).has({ value: '' }),
      ]);
    });
  },
  selectSourceFilter(source) {
    cy.do([
      sourceAccordion.clickHeader(),
      sourceAccordion
        .find(Checkbox({ id: `clickable-filter-source-${source.toLowerCase()}` }))
        .click(),
    ]);
  },
  verifySourceFilterApplied() {
    cy.expect(sourceAccordion.find(Checkbox({ checked: true })).exists());
  },
  checkSearchInputCleared() {
    cy.expect(searchInput.has({ value: '' }));
  },
  verifyFiltersOrder(expectedFilters) {
    expectedFilters.forEach((filterName, index) => {
      cy.expect(
        selectInstanceModal
          .find(Accordion({ index }))
          .find(HTML(including(filterName)))
          .exists(),
      );
    });
  },
  fillInSearchQuery(searchValue) {
    cy.do([searchInput.fillIn(searchValue)]);
  },
  focusOnSearchField() {
    cy.do(searchInput.focus());
  },
  clearSearchInputField() {
    cy.do(searchInput.focus());
    cy.do(searchInput.find(clearIcon).click());
    this.checkSearchInputFieldValue('');
  },
  checkClearIconShownInSearchField(isShown = true) {
    if (isShown) cy.expect(searchInput.find(clearIcon).exists());
    else cy.expect(searchInput.find(clearIcon).absent());
  },
  checkSearchInputFieldInFocus(isFocused) {
    cy.expect(searchInput.has({ focused: isFocused }));
  },
  checkSearchButtonEnabled() {
    cy.expect(searchButton.has({ disabled: false }));
  },

  validateSearchTableColumnsShown(columnHeaders = COLUMN_HEADERS, isShown = true) {
    const headers = Array.isArray(columnHeaders) ? columnHeaders : [columnHeaders];
    cy.get('#list-plugin-find-records div[class^="mclScrollable"]')
      .should('exist')
      .scrollTo('right', { ensureScrollable: false });
    headers.forEach((header) => {
      if (isShown) cy.expect(resultsList.find(MultiColumnListHeader(header)).exists());
      else cy.expect(resultsList.find(MultiColumnListHeader(header)).absent());
    });
  },

  expandAccordion(accordionName) {
    cy.do(selectInstanceModal.find(Accordion(accordionName)).clickHeader());
    cy.expect(selectInstanceModal.find(Accordion(accordionName)).has({ open: true }));
  },

  checkOptionsWithCountersExistInAccordion(accordionName) {
    cy.do(selectInstanceModal.find(Accordion(accordionName)).find(MultiSelect()).open());
    cy.expect(MultiSelectOption({ text: matching(/.{1,}(\d{1,})/) }).exists());
  },

  verifyOptionAvailableMultiselect(accordionName, optionName, isShown = true) {
    const escapedValue = optionName.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    const option = MultiSelectOption(matching(escapedValue));
    cy.do(selectInstanceModal.find(Accordion(accordionName)).find(MultiSelect()).open());
    if (isShown) cy.expect(option.exists());
    else cy.expect(option.absent());
  },

  verifyMultiSelectFilterNumberOfOptions(accordionName, numberOfOptions) {
    const multiSelect = selectInstanceModal.find(Accordion(accordionName)).find(MultiSelect());
    cy.do(multiSelect.open());
    cy.wait(1000);
    cy.expect(MultiSelectMenu({ optionCount: numberOfOptions }).exists());
  },

  selectMultiSelectFilterOption(accordionName, optionName) {
    const multiSelect = selectInstanceModal.find(Accordion(accordionName)).find(MultiSelect());
    const escapedValue = optionName.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    cy.do(multiSelect.open());
    cy.wait(1_000);
    cy.do(MultiSelectOption(matching(new RegExp(`^${escapedValue}\\(\\d+\\)$`))).clickSegment());
  },

  typeValueInMultiSelectFilterFieldAndCheck(accordionName, value, isFound = true, foundCount = 1) {
    const multiSelect = selectInstanceModal.find(Accordion(accordionName)).find(MultiSelect());
    cy.do(multiSelect.fillIn(value));
    cy.wait(1000);
    if (isFound) {
      cy.expect(MultiSelectOption(including(value)).exists());
      cy.expect(MultiSelectMenu({ optionCount: foundCount }).exists());
    } else cy.expect(MultiSelectOption(including(value)).absent());
  },

  typeNotFullValueInMultiSelectFilterFieldAndCheck(
    accordionName,
    notFullValue,
    fullValue,
    isFound = true,
  ) {
    const multiSelect = selectInstanceModal.find(Accordion(accordionName)).find(MultiSelect());
    cy.do(multiSelect.fillIn(notFullValue));
    cy.wait(1000);
    if (isFound) {
      cy.expect(MultiSelectOption(including(fullValue)).exists());
    } else cy.expect(MultiSelectOption(including(fullValue)).absent());
  },

  verifyMultiSelectFilterOptionCount(accordionName, optionName, expectedCount) {
    const multiSelect = selectInstanceModal.find(Accordion(accordionName)).find(MultiSelect());
    const escapedValue = optionName.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    cy.do(multiSelect.open());
    cy.expect(
      MultiSelectOption(matching(new RegExp(`^${escapedValue}\\(\\d+\\)$`)), {
        totalRecords: expectedCount,
      }).exists(),
    );
  },

  checkModalIncludesText(text) {
    const value = text instanceof RegExp ? text : matching(text);
    cy.expect(selectInstanceModal.find(HTML(value)).exists());
  },
};
