import {
  Accordion,
  Button,
  MultiColumnListHeader,
  SearchField,
  Select,
  Section,
  HTML,
  including,
  MultiColumnList,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiSelect,
  Pane,
} from '../../../../interactors';

const searchOptions = {
  selectBrowseOption: { option: 'Select a browse option' },
  personalName: { option: 'Personal name', value: 'perosnalName' },
  corporateConferenceName: { option: 'Corporate/Conference name', value: 'corporateNameTitle' },
  geographicName: { option: 'Geographic name', value: 'geographicName' },
  nameTitle: { option: 'Name-title', value: 'nameTitle' },
  uniformTitle: { option: 'Uniform title', value: 'uniformTitle' },
  subject: { option: 'Subject', value: 'subject' },
  genre: { option: 'Genre', value: 'genre' },
};

// TODO: redefine section id
const rootSection = Section({ id: 'authority-search-results-pane' });
const presentedColumns = ['Authorized/Reference', 'Heading/Reference', 'Type of heading'];
const rootPaneAuthoritiesFilters = Section({ id: 'pane-authorities-filters' });
const defaultMainFilterValue = { htmlValue: '', visibleValue: searchOptions.selectBrowseOption };
const searchButton = Button({ id: 'submit-authorities-search' });
const enabledSearchButton = Button({ id: 'submit-authorities-search', disabled: false });
const searchInput = SearchField({ id: 'textarea-authorities-search' });
const mainFilter = SearchField({ id: 'textarea-authorities-search-qindex' });
const browseSearchAndFilterInput = Select('Search field index');
const resetButton = Button('Reset all');
const sourceFieldAccordion = Section({ id: 'sourceFileId' });
const referencesFilterAccordion = Section({ id: 'references' });
const headingTypeAccordion = Section({ id: 'headingType' });
const browseResultsPane = Pane({ id: 'authority-search-results-pane' });
// TODO: initially first line has data-row-index = 52. Currently it's 0, clarify the reason in case if start index will changed once again
const getFirstLineIndexRow = (zeroIndex) => `row-${zeroIndex + 0}`;

export default {
  searchOptions,
  waitEmptyTable: () => {
    cy.expect(
      rootSection
        .find(HTML(including('Choose a filter or enter a search query to show results')))
        .exists(),
    );
  },

  waitLoading: () => {
    cy.expect(rootSection.find(HTML(including('Loading...'))).absent());
    cy.expect(rootSection.find(MultiColumnListRow({ indexRow: getFirstLineIndexRow(0) })).exists());
  },

  checkPresentedColumns: () => presentedColumns.forEach((columnName) => cy.expect(rootSection.find(MultiColumnListHeader(columnName)).exists())),
  // TODO: add checing of ""Type of heading" accordion button."
  checkFiltersInitialState: () => {
    cy.expect(mainFilter.has({ selectedFilter: defaultMainFilterValue.htmlValue }));
    cy.expect(searchButton.has({ disabled: true }));
    cy.expect(
      rootPaneAuthoritiesFilters
        .find(Button({ id: 'clickable-reset-all' }))
        .has({ disabled: true }),
    );
    cy.expect(rootPaneAuthoritiesFilters.find(Accordion('References')).exists());
  },

  selectOptionAndQueryAndCheck: (searchOption, value) => {
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value }));
    cy.do(browseSearchAndFilterInput.choose(searchOption));
    cy.then(() => {
      cy.get('#textarea-authorities-search-qindex').then((elem) => {
        expect(elem.text()).to.include(searchOption);
      });
    }).then(() => {
      cy.expect(enabledSearchButton.exists());
    });
  },

  searchBy(searchOption, value) {
    this.selectOptionAndQueryAndCheck(searchOption, value);
    cy.do(searchButton.click());
  },

  searchByChangingParameter(searchOption, value) {
    cy.expect(searchInput.has({ value }));
    // Waiter required for the search option to be loaded.
    cy.wait(500);
    cy.do(browseSearchAndFilterInput.choose(searchOption));
    cy.get('#textarea-authorities-search-qindex').then((elem) => {
      expect(elem.text()).to.include(searchOption);
    });
    cy.expect(enabledSearchButton.exists());
    cy.do(searchButton.click());
  },

  searchByChangingValue(searchOption, value) {
    cy.get('#textarea-authorities-search-qindex').then((elem) => {
      expect(elem.text()).to.include(searchOption);
    });
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value }));
    cy.expect(enabledSearchButton.exists());
    cy.do(searchButton.click());
  },

  checkSearchOptions: () => {
    // TODO: issue with openning of select by interactors and cypress. Try to find working option
    cy.get('#textarea-authorities-search-qindex>option').should(
      'have.text',
      Object.values(searchOptions)
        .map((searchOption) => searchOption.option)
        .join(''),
    );
  },

  checkSelectedSearchOption: (searchOption) => {
    cy.expect(mainFilter.has({ selectedFilter: searchOption.value }));
  },

  getNotExistingHeadingReferenceValue: (requestedHeadingReference) => `${requestedHeadingReference}\xa0would be here`,
  checkHeadingReferenceInRow(rowNumber, headingReferenceValue, isRef) {
    const specialCell = rootSection
      .find(MultiColumnListRow({ rowIndexInParent: `row-${rowNumber}` }))
      .find(MultiColumnListCell({ content: headingReferenceValue }));
    cy.expect(specialCell.exists());
    if (isRef) {
      cy.expect(specialCell.find(Button()).exists());
    } else {
      cy.expect(specialCell.find(Button()).absent());
    }
  },

  checkResultWithNoValue(value) {
    cy.expect([
      // eslint-disable-next-line no-irregular-whitespace
      MultiColumnListCell(including(`${value} would be here`)).exists(),
      MultiColumnListCell(value).absent(),
    ]);
  },

  checkResultWithValue(
    auth,
    value,
    isShown = true,
    checkHighlighted = false,
    typeOfHeading = false,
  ) {
    if (isShown) {
      let targetRowIndex;
      cy.do(
        browseResultsPane
          .find(MultiColumnListCell(value, { column: 'Heading/Reference' }))
          .perform((el) => {
            targetRowIndex = +el.parentElement.getAttribute('data-row-inner');
          }),
      );
      cy.then(() => {
        cy.expect(MultiColumnListCell({ content: auth, row: targetRowIndex }).exists());
        if (checkHighlighted) {
          cy.expect(
            MultiColumnListCell({ content: value, row: targetRowIndex })
              .find(HTML({ className: including('anchorLink') }))
              .exists(),
          );
        }
        if (typeOfHeading) cy.expect(MultiColumnListCell({ content: typeOfHeading, row: targetRowIndex }).exists());
      });
    } else {
      cy.expect(MultiColumnListCell({ content: value }).absent());
    }
  },

  checkResultWithValueA(valueA, auth, valueAuth, ref, valueRef) {
    cy.expect([
      // eslint-disable-next-line no-irregular-whitespace
      MultiColumnListCell({ content: `${valueA} would be here` }).exists(),
      MultiColumnListCell({ content: auth }).exists(),
      MultiColumnListCell({ content: valueAuth }).exists(),
      MultiColumnListCell({ content: ref }).exists(),
      MultiColumnListCell({ content: valueRef }).exists(),
    ]);
  },

  checkResultWithValueB(auth, valueAuth, ref, valueRef) {
    cy.expect([
      MultiColumnListCell({ content: auth }).exists(),
      MultiColumnListCell({ content: valueAuth }).exists(),
      MultiColumnListCell({ content: ref }).exists(),
      MultiColumnListCell({ content: valueRef }).exists(),
    ]);
  },

  checkHeadingReference: (nonExactheadingReference, headingReference) => {
    cy.expect([
      rootSection
        .find(
          // eslint-disable-next-line no-irregular-whitespace
          MultiColumnListCell({ content: `${nonExactheadingReference} would be here` }),
        )
        .exists(),
      rootSection.find(MultiColumnListCell({ content: `${headingReference}` })).exists(),
    ]);
  },

  verifyBrowseAuthorityPane(searchOption, inputValue) {
    cy.expect([
      browseSearchAndFilterInput.has({ checkedOptionText: searchOption }),
      searchInput.has({ value: inputValue }),
      resetButton.exists(),
      searchButton.exists(),
      sourceFieldAccordion.find(MultiSelect({ label: including('Authority source') })).exists(),
      sourceFieldAccordion.find(MultiSelect({ selectedCount: 0 })).exists(),
      referencesFilterAccordion.has({ expanded: false }),
      headingTypeAccordion.has({ expanded: false }),
    ]);
  },

  checkAllRowsHaveOnlyExpectedValues(columnIndex, expectedValues) {
    cy.expect(browseResultsPane.find(MultiColumnList()).exists());
    cy.get('[data-row-index]').each(($row) => {
      cy.wrap($row)
        .find(`[class*=mclCell]:eq(${columnIndex})`)
        .invoke('text')
        .then((text) => {
          const cellValue = text.trim();
          expect([...expectedValues, '']).to.include(cellValue);
        });
    });
  },

  clickResetAllAndCheck: () => {
    cy.do(resetButton.click());
    cy.expect([
      browseResultsPane.find(MultiColumnList()).absent(),
      enabledSearchButton.absent(),
      searchInput.has({ value: '' }),
    ]);
  },
};
