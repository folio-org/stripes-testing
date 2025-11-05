import { HTML, including, or } from '@interactors/html';
import {
  Button,
  Modal,
  MultiColumnListCell,
  MultiColumnList,
  MultiColumnListRow,
  Accordion,
  Checkbox,
  MultiSelect,
  TextField,
  SearchField,
} from '../../../../interactors';

const selectInstanceModal = Modal('Select instance');
const resetAllButton = selectInstanceModal.find(Button('Reset all'));
const resultsList = selectInstanceModal.find(HTML({ id: 'list-plugin-find-records' }));
const effectiveLocationAccordion = Accordion({ id: 'effectiveLocation' });
const languageAccordion = Accordion({ id: 'language' });
const resourceTypeAccordion = Accordion({ id: 'resource' });
const formatAccordion = Accordion({ id: 'format' });
const modeOfIssuance = Accordion({ id: 'mode' });
const natureOfContentAccordion = Accordion({ id: 'natureOfContent' });
const staffSuppressAccordion = Accordion({ id: 'staffSuppress' });
const discoverySuppressAccordion = Accordion({ id: 'instancesDiscoverySuppress' });
const createdDateAccordion = Accordion({ id: 'createdDate' });
const updatedDateAccordion = Accordion({ id: 'updatedDate' });
const sourceAccordion = Accordion({ id: 'source' });
const tagsAccordion = Accordion('Tags');
const searchField = SearchField('Search field index');
const searchButton = Button('Search');
const startDateField = TextField({ name: 'startDate' });
const endDateField = TextField({ name: 'endDate' });
const applyButton = Button('Apply');

export default {
  waitLoading() {
    cy.expect(selectInstanceModal.exists());
  },
  searchByTitle(title) {
    cy.do([
      selectInstanceModal.find(searchField).selectIndex('Title (all)'),
      selectInstanceModal.find(searchField).fillIn(title),
      selectInstanceModal.find(Button('Search')).click(),
    ]);
    cy.expect(selectInstanceModal.find(MultiColumnList()).has({ rowCount: 1 }));
  },

  selectTheFirstInstance() {
    cy.do(selectInstanceModal.find(MultiColumnListRow({ index: 0 })).click());
  },

  fillInSearchField(title) {
    cy.do([selectInstanceModal.find(searchField).fillIn(title)]);
  },

  clickSearchButton() {
    cy.do(selectInstanceModal.find(searchButton).click());
  },

  filterByEffectiveLocation(option) {
    cy.expect(effectiveLocationAccordion.exists());
    cy.wait(500);
    cy.get('#accordion-toggle-button-effectiveLocation').click();
    cy.wait(500);
    cy.get('#effectiveLocation-multiselect-input').click();
    cy.wait(500);
    // eslint-disable-next-line cypress/no-force
    cy.get('#effectiveLocation-multiselect-input').type(option, {
      force: true,
    });
    cy.get('#multiselect-option-list-effectiveLocation-multiselect').contains(option).click();
    cy.expect(MultiSelect({ selected: including(option) }).exists());
    cy.wait(1000);
  },
  filterByLanguage(option) {
    cy.do(languageAccordion.clickHeader());
    cy.wait(500);
    cy.get('#language-multiselect-input').click();
    cy.wait(500);
    // eslint-disable-next-line cypress/no-force
    cy.get('#language-multiselect-input').type(option, {
      force: true,
    });
    cy.get('#multiselect-option-list-language-multiselect').contains(option).click();
    cy.expect(MultiSelect({ selected: including(option) }).exists());
    cy.wait(1000);
  },
  filterByResourceType(option) {
    cy.do(resourceTypeAccordion.clickHeader());
    cy.wait(500);
    cy.get('#resource-multiselect-input').click();
    cy.wait(500);
    // eslint-disable-next-line cypress/no-force
    cy.get('#resource-multiselect-input').type(option, {
      force: true,
    });
    cy.get('#multiselect-option-list-resource-multiselect').contains(option).click();
    cy.expect(MultiSelect({ selected: including(option) }).exists());
    cy.wait(2000);
  },
  filterByFormat(option) {
    cy.do(formatAccordion.clickHeader());
    cy.wait(500);
    cy.get('#format-multiselect-input').click();
    cy.wait(500);
    // eslint-disable-next-line cypress/no-force
    cy.get('#format-multiselect-input').type(option, {
      force: true,
    });
    cy.get('#multiselect-option-list-format-multiselect').contains(option).click();
    cy.expect(MultiSelect({ selected: including(option) }).exists());
    cy.wait(2000);
  },
  filterByModeOfIssuance(option) {
    cy.do(modeOfIssuance.clickHeader());
    cy.wait(500);
    cy.get('#mode-multiselect-input').click();
    cy.wait(500);
    // eslint-disable-next-line cypress/no-force
    cy.get('#mode-multiselect-input').type(option, {
      force: true,
    });
    cy.get('#multiselect-option-list-mode-multiselect').contains(option).click();
    cy.expect(MultiSelect({ selected: including(option) }).exists());
    cy.wait(2000);
  },
  filterByNatureOfContent(option) {
    cy.do(natureOfContentAccordion.clickHeader());
    cy.wait(500);
    cy.get('#natureOfContent-multiselect-input').click();
    cy.wait(500);
    // eslint-disable-next-line cypress/no-force
    cy.get('#natureOfContent-multiselect-input').type(option, {
      force: true,
    });
    cy.get('#multiselect-option-list-natureOfContent-multiselect').contains(option).click();
    cy.expect(MultiSelect({ selected: including(option) }).exists());
    cy.wait(2000);
  },
  filterByStaffSuppress(option) {
    cy.do(staffSuppressAccordion.clickHeader());
    if (option === 'Yes') {
      cy.do(
        staffSuppressAccordion
          .find(Checkbox({ id: 'clickable-filter-staffSuppress-true' }))
          .click(),
      );
      cy.wait(2000);
    } else {
      cy.do(
        staffSuppressAccordion
          .find(Checkbox({ id: 'clickable-filter-staffSuppress-false' }))
          .click(),
      );
      cy.wait(2000);
    }
  },
  filterBySuppressFromDiscovery(option) {
    cy.do(discoverySuppressAccordion.clickHeader());
    if (option === 'Yes') {
      cy.do(
        discoverySuppressAccordion
          .find(Checkbox({ id: 'clickable-filter-instancesDiscoverySuppress-true' }))
          .click(),
      );
      cy.wait(1000);
    } else if (option === 'No') {
      cy.do(
        discoverySuppressAccordion
          .find(Checkbox({ id: 'clickable-filter-instancesDiscoverySuppress-false' }))
          .click(),
      );
      cy.wait(2000);
    }
  },
  filterByDateCreated(startDate, endDate) {
    cy.do([
      createdDateAccordion.clickHeader(),
      createdDateAccordion.find(startDateField).fillIn(startDate),
      createdDateAccordion.find(endDateField).fillIn(endDate),
      createdDateAccordion.find(applyButton).click(),
    ]);
  },
  filterByDateUpdated(startDate, endDate) {
    cy.do([
      updatedDateAccordion.clickHeader(),
      updatedDateAccordion.find(startDateField).fillIn(startDate),
      updatedDateAccordion.find(endDateField).fillIn(endDate),
      updatedDateAccordion.find(applyButton).click(),
    ]);
  },
  filterBySource(source, title) {
    if (source === 'FOLIO') {
      cy.do([
        sourceAccordion.clickHeader(),
        sourceAccordion.find(Checkbox({ id: 'clickable-filter-source-folio' })).click(),
      ]);
      this.searchByTitle(title);
    } else {
      cy.do([
        sourceAccordion.clickHeader(),
        sourceAccordion.find(Checkbox({ id: 'clickable-filter-source-marc' })).click(),
      ]);
      this.searchByTitle(title);
    }
  },
  filterByTags(option) {
    cy.do(selectInstanceModal.find(tagsAccordion).clickHeader());
    cy.wait(500);
    cy.get('#instancesTags-multiselect-input').click();
    cy.wait(500);
    // eslint-disable-next-line cypress/no-force
    cy.get('#instancesTags-multiselect-input').type(option, {
      force: true,
    });
    cy.get('#multiselect-option-list-instancesTags-multiselect').contains(option).click();
    cy.expect(MultiSelect({ selected: including(option) }).exists());
    cy.wait(2000);
  },
  verifyListResults(title) {
    cy.expect(
      resultsList
        .find(MultiColumnListCell({ column: 'Title', content: including(title) }))
        .exists(),
    );
  },
  verifyListResultsNotContains(title) {
    cy.expect(
      resultsList
        .find(MultiColumnListCell({ column: 'Title', content: including(title) }))
        .absent(),
    );
  },
  clickResetAllButton() {
    cy.expect(resetAllButton.has({ disabled: false }));
    cy.do(resetAllButton.click());
    cy.wait(2000);
    cy.expect(
      selectInstanceModal
        .find(HTML({ className: including('noResultsMessage-') }))
        .has({ text: 'Choose a filter or enter a search query to show results.' }),
    );
  },

  verifyAccordionExistance(accordionName) {
    cy.expect(Accordion(accordionName).exists());
  },

  clickAccordionByName(accordionName) {
    cy.do(Accordion(accordionName).clickHeader());
  },

  verifyCheckboxInAccordion(accordionName, checkboxValue, isChecked = null) {
    cy.expect(Accordion(accordionName).find(Checkbox(checkboxValue)).exists());
    if (isChecked !== null) cy.expect(Accordion(accordionName).find(Checkbox(checkboxValue)).has({ checked: isChecked }));
  },

  checkEmptySearchResults(headingReference) {
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

  selectOptionInExpandedFilter(accordionName, optionName, selected = true) {
    const checkbox = Accordion(accordionName).find(Checkbox(optionName));
    cy.do(checkbox.click());
    // wait for facet options to reload in all facets
    cy.wait(1000);
    cy.expect(checkbox.has({ checked: selected }));
  },

  verifyResultRowContentSharedIcon(heading, isShared) {
    const sharedIconRow = MultiColumnListRow(including(heading), { isContainer: false }).find(
      MultiColumnListCell({ innerHTML: including('sharedIcon') }),
    );

    cy.expect(isShared ? sharedIconRow.exists() : sharedIconRow.absent());
  },

  clearSourceFilter() {
    cy.do(
      sourceAccordion
        .find(Button({ ariaLabel: including('Clear selected Source filters') }))
        .click(),
    );
  },

  clearDefaultFilter(accordionName) {
    cy.do(
      Button({
        ariaLabel: or(
          `Clear selected filters for "${accordionName}"`,
          `Clear selected ${accordionName} filters`,
        ),
      }).click(),
    );
  },
};
