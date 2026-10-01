import {
  Accordion,
  Button,
  Checkbox,
  including,
  Option,
  Select,
  TextField,
} from '../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../constants';
import { WidgetFilter, WidgetFilterRule } from './widget';

const widgetFormConstructor = (formPane) => {
  const searchAccordion = formPane.find(Accordion({ id: 'simple-search-form-matches' }));
  const filtersAccordion = formPane.find(Accordion({ id: 'simple-search-form-filters' }));
  const resultsDisplayAccordion = formPane.find(Accordion({ id: 'simple-search-form-results' }));

  const widgetNameField = formPane.find(TextField({ name: 'name' }));
  const widgetDefinitionSelect = formPane.find(Select({ name: 'definition' }));
  const searchInputField = formPane.find(TextField({ name: 'matches.term' }));
  const urlLinkInputField = formPane.find(TextField({ name: 'configurableProperties.urlLink' }));

  const saveAndCloseButton = formPane.find(Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE));
  const addFilterButton = filtersAccordion.find(Button('Add filter'));
  const addColumnButton = resultsDisplayAccordion.find(Button('Add column'));
  const sortBySelect = resultsDisplayAccordion.find(Select({ name: 'sortColumn.name' }));
  const sortDirectionSelect = resultsDisplayAccordion.find(Select({ name: 'sortColumn.sortType' }));

  return {
    waitLoading() {
      cy.expect([formPane.exists(), widgetDefinitionSelect.exists()]);
    },

    fillWidgetName(value) {
      cy.do(widgetNameField.fillIn(value));
    },

    selectWidgetDefinition(label) {
      cy.do(widgetDefinitionSelect.choose(label));
    },

    selectResultsDisplayColumn(label, { index = 0 } = {}) {
      cy.do(
        resultsDisplayAccordion
          .find(Select({ name: `resultColumns[${index}].name` }))
          .choose(label),
      );
    },

    fillSearchTermField(value) {
      cy.do(searchInputField.fillIn(value));
    },

    clearSearchTermField() {
      cy.do(searchInputField.fillIn(''));
    },

    clickSearchMatchCheckbox(identifier, { filter = 'label' } = {}) {
      cy.do(searchAccordion.find(Checkbox({ [filter]: identifier })).click());
    },

    addFilter() {
      cy.expect(addFilterButton.exists());
      cy.do(addFilterButton.click());
    },

    selectFilterColumn(label, { index = 0 } = {}) {
      cy.do(filtersAccordion.find(WidgetFilter({ index })).selectFilterBy(label));
    },

    addFilterRule({ index = 0 } = {}) {
      cy.do(filtersAccordion.find(WidgetFilter({ index })).addRule());
    },

    selectFilterComparator(comparatorLabel, { index = 0, ruleIndex = 0 } = {}) {
      cy.do(
        filtersAccordion
          .find(WidgetFilter({ index }))
          .find(WidgetFilterRule({ index: ruleIndex }))
          .selectComparator(comparatorLabel),
      );
    },

    fillFilterTextValue(value, { index = 0, ruleIndex = 0 } = {}) {
      cy.do(
        filtersAccordion
          .find(WidgetFilter({ index }))
          .find(WidgetFilterRule({ index: ruleIndex }))
          .fillTextValue(value),
      );
    },

    removeFilter({ index = -1 } = {}) {
      cy.do(
        filtersAccordion.perform(($el) => {
          const trashButtons = $el.querySelectorAll('button[icon="trash"]');

          Array.from(trashButtons).at(index)?.click();
        }),
      );
    },

    selectSortBy(label) {
      cy.do(sortBySelect.choose(label));
    },

    selectSortDirection(label) {
      cy.do(sortDirectionSelect.choose(label));
    },

    addColumn() {
      cy.do(addColumnButton.click());
    },

    saveWidget() {
      cy.do([saveAndCloseButton.click()]);
    },

    /* ASSERTIONS */
    assertSearchAccordionExists() {
      cy.expect(searchAccordion.exists());
    },

    assertFiltersAccordionExists() {
      cy.expect(filtersAccordion.exists());
    },

    assertResultsDisplayAccordionExists() {
      cy.expect(resultsDisplayAccordion.exists());
    },

    assertWidgetName(value) {
      cy.expect(widgetNameField.has({ value }));
    },

    assertWidgetDefinition(selectedOptionLabel) {
      cy.expect(widgetDefinitionSelect.has({ selectedOptionLabel }));
    },

    assertUrlLink(value) {
      cy.expect(urlLinkInputField.has({ value }));
    },

    assertSearchTerm(value) {
      cy.expect(searchInputField.has({ value }));
    },

    assertMatchesCheckboxes(items = []) {
      items.forEach(([label, value]) => {
        cy.expect(
          searchAccordion.find(Checkbox({ label: including(label), checked: value })).exists(),
        );
      });
    },

    assertFilterColumn(columnLabel, { index = 0 } = {}) {
      cy.expect(filtersAccordion.find(WidgetFilter({ index })).has({ filterBy: columnLabel }));
    },

    assertFilterRuleComparator(comparatorValue, { index = 0, ruleIndex = 0 } = {}) {
      cy.expect(
        filtersAccordion
          .find(WidgetFilter({ index }))
          .find(WidgetFilterRule({ index: ruleIndex }))
          .has({ comparator: comparatorValue }),
      );
    },

    assertFilterRuleValue(value, { index = 0, ruleIndex = 0 } = {}) {
      cy.expect(
        filtersAccordion
          .find(WidgetFilter({ index }))
          .find(WidgetFilterRule({ index: ruleIndex }))
          .has({ value }),
      );
    },

    assertFiltersColumnsOptions(labels = [], { index = 0 } = {}) {
      this.addFilter();

      labels.forEach((label) => {
        cy.expect(
          filtersAccordion
            .find(Select({ name: `filterColumns[${index}].name` }))
            .find(Option({ text: label }))
            .exists(),
        );
      });

      this.removeFilter();
    },

    assertSortBy(selectedOptionLabel) {
      cy.expect(sortBySelect.has({ selectedOptionLabel }));
    },

    assertSortDirection(selectedOptionLabel) {
      cy.expect(sortDirectionSelect.has({ selectedOptionLabel }));
    },

    assertResultsColumnsMappings(mappings) {
      cy.get('div#droppable-for-resultColumns').within(() => {
        mappings.forEach(([label, mappedLabel]) => {
          // 1. Locate the unique row based on the select text
          cy.get('[class^="resultLine-"]')
            .contains('select', label)
            .closest('[class^="resultLine-"]')
            .as('currentRow'); // Store row context as an alias

          // 2. Assert the mapped label text exists inside this row
          cy.get('@currentRow')
            .contains(mappedLabel || label)
            .should('exist');

          // 3. Find the input directly without manually extracting the index array number
          // Uses a partial attribute selector to match the suffix pattern
          cy.get('@currentRow')
            .find('input[name^="resultColumns["][name$="].label"]')
            .should('exist');
        });
      });
    },

    assertResultsColumnsOptions(labels = [], { index = 0 } = {}) {
      labels.forEach((label) => {
        cy.expect(
          resultsDisplayAccordion
            .find(Select({ name: `resultColumns[${index}].name` }))
            .find(Option({ text: label }))
            .exists(),
        );
      });
    },
  };
};

export default widgetFormConstructor;
