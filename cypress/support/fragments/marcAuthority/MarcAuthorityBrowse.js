import {
  Accordion,
  Button,
  MultiColumnListHeader,
  SearchField,
  Select,
  Section,
  HTML,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
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

  searchBy: (searchOption, value) => {
    cy.do(searchInput.fillIn(value));
    cy.expect(searchInput.has({ value }));
    cy.do(browseSearchAndFilterInput.choose(searchOption));
    cy.get('#textarea-authorities-search-qindex').then((elem) => {
      expect(elem.text()).to.include(searchOption);
    });
    cy.expect(enabledSearchButton.exists());
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
    cy.get('select>option').should(
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

  checkResultWithValue(auth, value) {
    cy.expect([
      MultiColumnListCell({ content: auth }).exists(),
      MultiColumnListCell({ content: value }).exists(),
    ]);
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

  checkHeadingReference: (headingReference) => {
    cy.expect([
      rootSection
        .find(MultiColumnListRow({ rowIndexInParent: 'row-0' }))
        .find(MultiColumnListCell({ content: `${headingReference}\xa0would be here` })),
      rootSection
        .find(MultiColumnListRow({ rowIndexInParent: 'row-1' }))
        .find(MultiColumnListCell({ content: headingReference })),
    ]);
  },
};
