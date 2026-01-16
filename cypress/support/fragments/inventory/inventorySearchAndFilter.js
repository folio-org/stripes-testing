import { HTML, including, matching } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  Form,
  Icon,
  KeyValue,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  OptionGroup,
  Pane,
  PaneHeader,
  SearchField,
  Section,
  Select,
  TextArea,
  TextField,
  ValueChipRoot,
  not,
  or,
} from '../../../../interactors';
import {
  BROWSE_CALL_NUMBER_OPTIONS,
  BROWSE_CLASSIFICATION_OPTIONS,
  INVENTORY_COLUMN_HEADERS,
} from '../../constants';
import DateTools from '../../utils/dateTools';
import logsViewAll from '../data_import/logs/logsViewAll';
import InventoryActions from './inventoryActions';
import InventoryInstance from './inventoryInstance';
import InventoryInstances, { searchInstancesOptions } from './inventoryInstances';
import InteractorsTools from '../../utils/interactorsTools';

const ONE_SECOND = 1000;
const searchAndFilterSection = Pane({ id: 'browse-inventory-filters-pane' });
const effectiveLocationInput = Accordion('Effective location (item)');
const sourceAccordion = Accordion('Source');
const sharedAccordion = Accordion({ id: 'shared' });
const languageInput = Accordion({ id: 'language' });
const resourceTypeAccordion = Accordion({ id: 'resource' });
const formatAccordion = Accordion({ id: 'format' });
const modeOfIssuanceAccordion = Accordion({ id: 'mode' });
const natureOfContentAccordion = Accordion({ id: 'natureOfContent' });
const stuffSupressAccordion = Accordion({ id: 'staffSuppress' });
const supressFromDiscoveryAccordion = Accordion({ id: 'instancesDiscoverySuppress' });
const statisticalCodeAccordionInstanceToggle = Accordion({ id: 'statisticalCodeIds' });
const dateCreatedAccordion = Accordion({ id: 'createdDate' });
const dateUpdatedAccordion = Accordion({ id: 'updatedDate' });
const instanceStatusAccordion = Accordion({ id: 'instanceStatus' });
const tagsAccordion = Accordion({ id: 'instancesTags' });
const keywordInput = TextArea({ id: 'input-inventory-search' });
const searchButton = Button({ type: 'submit' });
const inventorySearchAndFilter = TextArea({ id: 'input-inventory-search' });
const inventorySearchAndFilterInput = Select({
  id: 'input-inventory-search-qindex',
});
const browseSearchAndFilterInput = Select({ id: 'input-record-search-qindex' });
const browseSearchInputField = TextArea({ id: 'input-record-search' });
const browseResultList = MultiColumnList({ id: 'browse-results-list-callNumbers' });
const resetAllButton = Button({ id: 'clickable-reset-all' });
const resetAllBtn = Button('Reset all');
const navigationInstancesButton = Button({
  id: 'segment-navigation-instances',
});
const paneFilterSection = Section({ id: or('pane-filter', 'browse-inventory-filters-pane') });
const paneResultsSection = Section({ id: 'pane-results' });
const instanceDetailsSection = Section({ id: 'pane-instancedetails' });
const instancesTagsSection = Section({ id: including('Tags') });
const tagsPane = Pane('Tags');
const tagsButton = Button({ id: 'clickable-show-tags' });
const tagsAccordionButton = instancesTagsSection.find(Button('Tags'));
const emptyResultsMessage = 'Choose a filter or enter a search query to show results.';
const browseButton = Button({ id: 'mode-navigation-browse' });
const viewHoldingButton = Button('View holdings');
const callNumberBrowsePane = Pane({ title: 'Browse inventory' });
const actionsButton = Button('Actions');
const editInstanceButton = Button('Edit instance');
const inventorySearchResultsPane = Section({ id: 'browse-inventory-results-pane' });
const nextButton = Button({ id: 'browse-results-list-callNumbers-next-paging-button' });
const listInventoryNextPagingButton = Button({ id: 'list-inventory-next-paging-button' });
const previousButton = Button({ id: 'browse-results-list-callNumbers-prev-paging-button' });
const listInventoryPreviousPagingButton = Button({ id: 'list-inventory-prev-paging-button' });
const instancesList = MultiColumnList({ id: or('list-inventory', 'list-plugin-find-records') });
const getListHeader = (name) => inventorySearchResultsPane.find(MultiColumnListHeader(name));

const searchToggleButton = Button({ id: 'mode-navigation-search' });
const browseToggleButton = Button({ id: 'mode-navigation-browse' });
const holdingsToggleButton = Button({ id: 'segment-navigation-holdings' });
const itemToggleButton = Button({ id: 'segment-navigation-items' });
const searchTypeDropdown = Select('Search field index');
const nameTypeAccordion = Accordion({ id: 'nameType' });
const closeIconButton = Button({ icon: 'times' });
const heldByAccordion = Accordion('Held by');
const dateRangeAccordion = Accordion('Date range');
const dateRangeFromField = dateRangeAccordion.find(TextField({ name: 'startDate' }));
const dateRangeToField = dateRangeAccordion.find(TextField({ name: 'endDate' }));
const filterApplyButton = Button('Apply');
const invalidDateErrorText = 'Please enter a valid year';
const dateOrderErrorText = 'Start date is greater than end date';
const clearIcon = Button({ icon: 'times-circle-solid' });
const getSearchErrorText = (query) => `Search could not be processed for ${query}. Please check your query and try again.`;
const anyBrowseResultList = MultiColumnList({ id: including('browse-results-list-') });
const URI_CHAR_LIMIT = 8192;
const uriCharLimitErrorText = `Search URI request character limit has been exceeded. The character limit is ${URI_CHAR_LIMIT}. Please revise your search and/or facet selections.`;

const searchInstanceByHRID = (id) => {
  cy.do([
    Select({ id: 'input-inventory-search-qindex' }).choose('Instance HRID'),
    TextArea({ id: 'input-inventory-search' }).fillIn(id),
    searchButton.click(),
  ]);
  cy.wait(2000);
};

const searchHoldingsByHRID = (hrid) => {
  cy.do([
    Select({ id: 'input-inventory-search-qindex' }).choose('Holdings HRID'),
    TextArea({ id: 'input-inventory-search' }).fillIn(hrid),
    searchButton.click(),
  ]);
  InventoryInstances.waitLoading();
};

const searchInstanceByTitle = (title) => {
  cy.do(TextArea({ id: 'input-inventory-search' }).fillIn(title));
  cy.wait(500);
  cy.do(searchButton.click());
  cy.wait(500);
  InventoryInstance.waitInventoryLoading();
};

const getInstanceHRID = () => {
  return logsViewAll
    .getSingleJobProfile() // get the first job id from job logs list
    .then(({ id }) => {
      // then, make request with the job id
      // and get the only record id inside the uploaded file
      const queryString = 'limit=1000&order=asc';
      return cy
        .request({
          method: 'GET',
          url: `${Cypress.env('OKAPI_HOST')}/metadata-provider/jobLogEntries/${id}?${queryString}`,
          headers: {
            'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
            'x-okapi-token': Cypress.env('token'),
          },
        })
        .then(({ body: { entries } }) => {
          // then, make request with the job id and the record id
          // and get Instance HRID
          const recordId = entries[0].sourceRecordId;
          return cy
            .request({
              method: 'GET',
              url: `${Cypress.env(
                'OKAPI_HOST',
              )}/metadata-provider/jobLogEntries/${id}/records/${recordId}`,
              headers: {
                'x-okapi-tenant': Cypress.env('OKAPI_TENANT'),
                'x-okapi-token': Cypress.env('token'),
              },
            })
            .then(({ body: { relatedInstanceInfo } }) => {
              return relatedInstanceInfo.hridList;
            });
        });
    });
};

const checkInstanceDetails = () => {
  // when creating mapping profile we choose status cataloged date as today
  // in inventory, it will be in YYYY-MM-DD format
  const expectedCatalogedDate = DateTools.getFormattedDate({
    date: new Date(),
  });
  // when creating mapping profile we choose instance status term as "Batch Loaded"
  // in inventory, this will be "batch" for status code and "Batch Loaded" for status term
  const expectedStatusTerm = 'Batch Loaded';
  const expectedStatusCode = 'batch';

  cy.do(
    Pane({ id: 'pane-results' })
      .find(MultiColumnListCell({ row: 0, columnIndex: 1 }))
      .click(),
  );
  const catalogedDate = KeyValue('Cataloged date');
  const instanceStatusTerm = KeyValue('Instance status term');
  const instanceStatusCode = KeyValue('Instance status code');

  cy.expect(catalogedDate.has({ value: expectedCatalogedDate }));
  cy.expect(instanceStatusTerm.has({ value: expectedStatusTerm }));
  cy.expect(instanceStatusCode.has({ value: expectedStatusCode }));
};

export default {
  searchInstanceByHRID,
  searchHoldingsByHRID,
  searchInstanceByTitle,
  getInstanceHRID,
  checkInstanceDetails,
  getAllSearchResults: () => MultiColumnList(),
  getSearchResult: (row = 0, col = 0) => paneResultsSection.find(MultiColumnListCell({ row, columnIndex: col })),
  waitLoading: () => cy.expect([Form().find(inventorySearchAndFilter).exists()]),
  browseCallNumberIsAbsent: () => cy.expect(HTML('Browse call numbers').absent()),
  browseSubjectIsAbsent: () => cy.expect(HTML('Browse subjects').absent()),
  dateRangeFromField,
  dateRangeToField,
  invalidDateErrorText,
  dateOrderErrorText,
  dateRangeAccordion,

  effectiveLocation: {
    mainLibrary: { id: 'clickable-filter-effectiveLocation-main-library' },
  },

  language: {
    eng: { id: 'clickable-filter-language-english' },
  },

  selectResultCheckboxes(count) {
    const clickActions = [];
    for (let i = 0; i < count; i++) {
      clickActions.push(this.getSearchResult(i).find(Checkbox()).click());
    }
    return cy.do(clickActions);
  },

  selectSearchResultItem(indexRow = 0) {
    cy.do(this.getSearchResult(indexRow, 0).click());
    // must wait page render
    cy.wait(2000);
  },
  clickSearchResultItem(indexRow = 8) {
    cy.do(this.getSearchResult(indexRow, 0).click());
  },

  verifyNumberOfSearchResults(expectedNumber) {
    cy.expect(instancesList.has({ rowCount: expectedNumber }));
  },

  byEffectiveLocation(values) {
    cy.do(effectiveLocationInput.clickHeader());
    // wait to avoid robotic clicks
    cy.wait(2000);
    cy.do([
      effectiveLocationInput.find(Button({ ariaLabel: 'open menu' })).click(),
      MultiSelectOption(including(values ?? 'Main Library')).clickSegment(),
    ]);
    cy.expect(ValueChipRoot(including(values ?? 'Main Library')).exists());
  },

  byLanguage(lang) {
    cy.do(languageInput.clickHeader());
    cy.wait(2000);
    cy.do([
      languageInput.find(Button({ ariaLabel: 'open menu' })).click(),
      MultiSelectOption(including(lang ?? 'English(')).clickSegment(),
    ]);
  },

  bySource(source) {
    cy.do(sourceAccordion.clickHeader());
    cy.do(sourceAccordion.find(Checkbox(source)).click());
    cy.expect(MultiColumnListRow().exists());
  },

  byShared(condititon) {
    cy.wait(1000);
    cy.do(sharedAccordion.clickHeader());
    if (condititon === 'Yes') {
      cy.do(sharedAccordion.find(Checkbox({ id: 'clickable-filter-shared-true' })).click());
    } else {
      cy.do(sharedAccordion.find(Checkbox({ id: 'clickable-filter-shared-false' })).click());
    }
    cy.wait(1000);
  },

  byKeywords(kw = '*') {
    cy.do([keywordInput.fillIn(kw), searchButton.click()]);
    cy.expect(MultiColumnListRow().exists());
  },

  selectBrowseCallNumbers() {
    this.switchToBrowseTab();
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(ONE_SECOND);
    cy.do(Select('Search field index').choose('Call numbers (all)'));
    cy.expect(effectiveLocationInput.exists());
  },

  selectBrowseSubjects() {
    this.switchToBrowseTab();
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(ONE_SECOND);
    cy.do(Select('Search field index').choose('Subjects'));
  },

  searchBySourceHolding: (source) => {
    cy.do(Button({ id: 'accordion-toggle-button-holdingsSource' }).click());
    cy.do(Checkbox(source).click());
  },

  selectBrowseContributors() {
    this.switchToBrowseTab();
    // cypress can not pick up an option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(ONE_SECOND);
    cy.do(Select('Search field index').choose('Contributors'));
  },

  selectBrowseOtherScheme() {
    this.switchToBrowseTab();
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(ONE_SECOND);
    cy.do(browseSearchAndFilterInput.choose('Other scheme'));
  },

  showsOnlyNameTypeAccordion() {
    cy.expect(Accordion({ id: 'nameType' }).exists());
    cy.expect(Accordion('Effective location (item)').absent());
    cy.expect(Accordion({ id: 'language' }).absent());
    cy.expect(Accordion({ id: 'resource' }).absent());
    cy.expect(Accordion({ id: 'format' }).absent());
    cy.expect(Accordion({ id: 'mode' }).absent());
    cy.expect(Accordion({ id: 'natureOfContent' }).absent());
    cy.expect(Accordion({ id: 'staffSuppress' }).absent());
    cy.expect(Accordion({ id: 'instancesDiscoverySuppress' }).absent());
    cy.expect(Accordion({ id: 'statisticalCodeIds' }).absent());
    cy.expect(Accordion({ id: 'createdDate' }).absent());
    cy.expect(Accordion({ id: 'updatedDate' }).absent());
    cy.expect(Accordion({ id: 'source' }).absent());
    cy.expect(Accordion({ id: 'instancesTags' }).absent());
  },

  showsOnlyEffectiveLocation() {
    cy.expect(Accordion('Effective location (item)').exists());
    cy.expect(Accordion({ id: 'language' }).absent());
    cy.expect(Accordion({ id: 'resource' }).absent());
    cy.expect(Accordion({ id: 'format' }).absent());
    cy.expect(Accordion({ id: 'mode' }).absent());
    cy.expect(Accordion({ id: 'natureOfContent' }).absent());
    cy.expect(Accordion({ id: 'staffSuppress' }).absent());
    cy.expect(Accordion({ id: 'instancesDiscoverySuppress' }).absent());
    cy.expect(Accordion({ id: 'statisticalCodeIds' }).absent());
    cy.expect(Accordion({ id: 'createdDate' }).absent());
    cy.expect(Accordion({ id: 'updatedDate' }).absent());
    cy.expect(Accordion({ id: 'source' }).absent());
    cy.expect(Accordion({ id: 'instancesTags' }).absent());
  },

  filtersIsAbsent() {
    cy.expect(Accordion('Effective location (item)').absent());
    cy.expect(Accordion({ id: 'language' }).absent());
    cy.expect(Accordion({ id: 'resource' }).absent());
    cy.expect(Accordion({ id: 'format' }).absent());
    cy.expect(Accordion({ id: 'mode' }).absent());
    cy.expect(Accordion({ id: 'natureOfContent' }).absent());
    cy.expect(Accordion({ id: 'staffSuppress' }).absent());
    cy.expect(Accordion({ id: 'instancesDiscoverySuppress' }).absent());
    cy.expect(Accordion({ id: 'statisticalCodeIds' }).absent());
    cy.expect(Accordion({ id: 'createdDate' }).absent());
    cy.expect(Accordion({ id: 'updatedDate' }).absent());
    cy.expect(Accordion({ id: 'source' }).absent());
    cy.expect(Accordion({ id: 'instancesTags' }).absent());
  },

  verifyBrowseOptions() {
    cy.do(browseSearchAndFilterInput.click());
    // eslint-disable-next-line no-unused-vars
    Object.values(BROWSE_CALL_NUMBER_OPTIONS).forEach((value) => {
      cy.expect(
        browseSearchAndFilterInput
          .find(OptionGroup('Call numbers (item)'))
          .has({ text: including(value) }),
      );
    });
    Object.values(BROWSE_CLASSIFICATION_OPTIONS).forEach((value) => {
      cy.expect(
        browseSearchAndFilterInput
          .find(OptionGroup('Classification (instance)'))
          .has({ text: including(value) }),
      );
    });
    cy.expect([
      browseSearchAndFilterInput.has({ content: including('Contributors') }),
      browseSearchAndFilterInput.has({ content: including('Subjects') }),
    ]);
  },

  verifyKeywordsAsDefault() {
    cy.get('#input-record-search-qindex').then((elem) => {
      expect(elem.text()).to.include('Select a browse option');
    });
    cy.expect(browseSearchAndFilterInput.exists());
  },

  switchToBrowseTab() {
    cy.wait(1000);
    cy.do(browseButton.click());
    cy.expect([
      Pane({ id: 'browse-inventory-filters-pane' }).exists(),
      Pane({ id: 'browse-inventory-results-pane' }).exists(),
      browseButton.has({ disabled: false }),
    ]);
  },

  verifySpecificTabHighlighted(tab) {
    cy.expect(Button(`${tab}`).has({ default: false }));
  },

  verifyBrowseResultsEmptyPane() {
    cy.expect(callNumberBrowsePane.exists());
    cy.expect(
      callNumberBrowsePane.has({
        subtitle: 'Enter search criteria to start browsing',
      }),
    );
    cy.expect(
      HTML(including('Browse for results entering a query or choosing a filter.')).exists(),
    );
  },

  verifyCallNumberBrowseNotEmptyPane() {
    cy.expect([
      callNumberBrowsePane.exists(),
      Pane({ subtitle: 'Enter search criteria to start browsing' }).absent(),
      HTML(including('Browse for results entering a query or choosing a filter.')).absent(),
    ]);
  },

  verifyCallNumberBrowsePane() {
    cy.expect(callNumberBrowsePane.exists());
  },

  verifySubjectsResultsInBrowsePane() {
    cy.expect(
      callNumberBrowsePane
        .find(MultiColumnList({ id: 'browse-results-list-browseSubjects' }))
        .find(MultiColumnListRow({ indexRow: 'row-0' }))
        .exists(),
    );
  },

  verifyCallNumbersResultsInBrowsePane(item) {
    cy.expect(callNumberBrowsePane.find(browseResultList).find(MultiColumnListCell(item)).exists());
  },

  saveUUIDs() {
    cy.wait(1500);
    InventoryActions.open();
    cy.do(InventoryActions.options.saveUUIDs.click());
  },
  saveHoldingsUUIDs() {
    InventoryActions.open();
    cy.do(InventoryActions.options.saveHoldingsUUIDs.click());
  },
  saveCQLQuery() {
    InventoryActions.open();
    cy.do(InventoryActions.options.saveCQLQuery.click());
    cy.wait(5000);
  },

  exportInstanceAsMarc() {
    InventoryActions.open();
    cy.do(InventoryActions.options.exportMARC.click());
  },

  showSelectedRecords() {
    InventoryActions.open();
    cy.do(InventoryActions.options.showSelectedRecords.click());
  },

  getUUIDsFromRequest(req) {
    const expectedUUIDs = [];
    req.response.body.ids.forEach((elem) => {
      expectedUUIDs.push(elem.id);
    });
    return expectedUUIDs;
  },

  getInstanceUUIDFromRequest(req) {
    const expectedUUID = req.response.body.id;
    return expectedUUID;
  },

  verifySelectedRecords(selected) {
    if (selected === 1) {
      cy.expect(
        Pane('Inventory').is({
          subtitle: including(`record found${selected} record selected`),
        }),
      );
    } else {
      cy.expect(
        Pane('Inventory').is({
          subtitle: including(`records found${selected} records selected`),
        }),
      );
    }
  },

  searchByParameter: (parameter, value) => {
    cy.do([
      SearchField({ id: 'input-inventory-search' }).selectIndex(parameter),
      keywordInput.fillIn(value),
    ]);
    cy.wait(500);
    cy.do(searchButton.focus());
    cy.wait(500);
    cy.do(searchButton.click());
    cy.wait(1000);
  },

  switchToItem: () => {
    cy.wait(500);
    cy.do(itemToggleButton.click());
    cy.wait(500);
  },

  switchToHoldings() {
    cy.wait(200);
    cy.do(holdingsToggleButton.click());
    cy.wait(500);
  },
  switchToInstance: () => cy.do(navigationInstancesButton.click()),

  instanceTabIsDefault() {
    cy.do(
      navigationInstancesButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  holdingsTabIsDefault() {
    cy.do(
      holdingsToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  itemTabIsDefault() {
    cy.do(
      itemToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  browseSubjectsSearch(searchString = 'test123') {
    cy.do([
      browseButton.click(),
      browseSearchInputField.fillIn(searchString),
      searchButton.click(),
    ]);
    cy.expect(Pane({ id: 'browse-inventory-results-pane' }).find(MultiColumnListHeader()).exists());
  },

  verifySearchResult: (cellContent, isFound = true) => {
    if (isFound) cy.expect(MultiColumnListCell({ content: cellContent }).exists());
    else cy.expect(MultiColumnListCell({ content: cellContent }).absent());
  },

  validateSearchTableHeaders() {
    cy.expect([
      getListHeader('Call number').exists(),
      getListHeader('Title').exists(),
      getListHeader('Number of titles').exists(),
    ]);
  },

  verifySearchResultIncludingValue: (value) => {
    cy.expect(MultiColumnListCell({ content: including(value) }).exists());
  },

  verifyContentNotExistInSearchResult: (cellContent) => cy.expect(MultiColumnListCell({ content: cellContent }).absent()),

  getInstancesByIdentifierViaApi(identifier, limit = 100) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'search/instances',
        searchParams: {
          limit,
          highlightMatch: true,
          query: `(identifiers.value="${identifier}" or isbn="${identifier}") sortby title`,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body: { instances } }) => {
        return instances;
      });
  },

  getInstancesBySubjectViaApi(subject, limit = 100) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'search/instances',
        searchParams: {
          limit,
          highlightMatch: true,
          query: `(subjects="${subject}") sortby title`,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body: { instances } }) => {
        return instances;
      });
  },

  selectSearchOptions(searchOption, text) {
    cy.do([
      inventorySearchAndFilterInput.choose(searchOption),
      inventorySearchAndFilter.fillIn(text),
    ]);
  },

  selectSearchOption(searchOption) {
    cy.do([inventorySearchAndFilterInput.choose(searchOption)]);
  },

  executeSearch(text) {
    cy.do(inventorySearchAndFilter.fillIn(text));
    this.clickSearch();
  },

  verifySelectedSearchOption(option) {
    cy.expect(inventorySearchAndFilterInput.has({ value: option }));
  },

  clickSearch() {
    cy.do(searchButton.click());
  },

  clickMarcAuthIconByTitle(title) {
    cy.window().then((win) => {
      cy.stub(win, 'open')
        .callsFake((url) => {
          cy.visit(url);
        })
        .as('windowOpen');
    });

    cy.contains('a[data-test-text-link="true"]', title)
      .closest('div[role="gridcell"]')
      .find('[data-link="authority-app"]')
      .click();
  },

  checkContributorRequest() {
    cy.intercept('GET', '/search/instances?*').as('getInstances');
    this.clickSearch();
    cy.wait('@getInstances').then((interception) => {
      // checking that request contains '=' after 'contributors.name'
      expect(interception.request.url).to.include('contributors.name%3D');
    });
  },

  resetAll() {
    cy.do(resetAllButton.click());
    cy.wait(1000);
  },

  clickResetAllButton() {
    cy.do(searchAndFilterSection.find(resetAllBtn).click());
    cy.wait(1000);
  },

  clickNextPaginationButton() {
    cy.do(inventorySearchResultsPane.find(nextButton).click());
  },

  clickListInventoryNextPaginationButton() {
    cy.do(listInventoryNextPagingButton.click());
  },

  clickPreviousPaginationButton() {
    cy.do(inventorySearchResultsPane.find(previousButton).click());
  },

  clickListInventoryPreviousPaginationButton() {
    cy.do(listInventoryPreviousPagingButton.click());
  },

  checkContributorsColumResult(cellContent) {
    cy.expect(
      MultiColumnList({ id: 'list-inventory' })
        .find(MultiColumnListCell(including(cellContent)))
        .exists(),
    );
  },

  checkMarcAuthAppIconInSearchResult() {
    cy.get('[alt="MARC Authorities module"]').should('have.length.at.least', 1);
  },

  checkMissingSearchResult(cellContent) {
    cy.expect(MultiColumnListCell({ content: cellContent }).absent());
  },

  verifyIsFilteredByTag(instanceTitle) {
    cy.expect(MultiColumnListCell({ row: 0, content: instanceTitle }).exists());
    cy.expect(MultiColumnList({ id: 'list-inventory' }).has({ rowCount: 1 }));
  },

  searchTag(tag) {
    // If Tags filter is expanded, directly fill in the tag
    // If Tags filter is collapsed, open it first then fill in the tag
    cy.get('body').then(($body) => {
      const tagsSection = $body.find('[data-test-accordion-section][id*="Tags"]');
      if (tagsSection.length > 0) {
        const contentWrap = tagsSection.find('[class^="content-wrap"]');
        const isExpanded = contentWrap.length > 0 && contentWrap.hasClass('expanded');

        if (isExpanded) {
          cy.do(MultiSelect({ id: 'instancesTags-multiselect' }).fillIn(tag));
        } else {
          cy.do([
            tagsAccordionButton.click(),
            MultiSelect({ id: 'instancesTags-multiselect' }).fillIn(tag),
          ]);
        }
      }
    });
  },

  filterByTag(tag) {
    cy.wait(500);
    cy.do(tagsAccordionButton.click());
    cy.wait(500);
    cy.do(MultiSelect({ id: 'instancesTags-multiselect' }).toggle());
    cy.wait(500);
    cy.do(MultiSelectOption(including(tag)).click());
    cy.wait(500);
  },

  filterHoldingsByTag(tag) {
    cy.wait(500);
    cy.do(tagsAccordionButton.click());
    cy.wait(500);
    cy.do(MultiSelect({ id: 'holdingsTags-multiselect' }).toggle());
    cy.wait(500);
    cy.do(MultiSelectOption(including(tag)).click());
    cy.wait(500);
  },

  filterItemsByTag(tag) {
    cy.wait(500);
    cy.do(tagsAccordionButton.click());
    cy.wait(500);
    cy.do(MultiSelect({ id: 'itemsTags-multiselect' }).toggle());
    cy.wait(500);
    cy.do(MultiSelectOption(including(tag)).click());
    cy.wait(500);
  },

  verifyTagIsAbsent(tag) {
    this.searchTag(tag);
    cy.expect(HTML('No matching items found!').exists());
  },

  verifyContributorsColumResult(cellContent) {
    cy.expect(
      MultiColumnList({ id: 'browse-results-list-contributors' })
        .find(MultiColumnListCell(including(cellContent)))
        .exists(),
    );
  },

  verifyResultPaneEmpty({ noResultsFound = false, searchQuery = '(?:\\S+)' } = {}) {
    const message = noResultsFound
      ? `No results found for "${searchQuery}". Please check your spelling and filters.`
      : emptyResultsMessage;

    cy.expect(
      paneResultsSection
        .find(HTML({ className: including('noResultsMessage-') }))
        .has({ text: matching(message) }),
    );
  },

  resetAllAndVerifyNoResultsAppear() {
    cy.do(resetAllButton.click());
    cy.expect(paneResultsSection.find(HTML(including(emptyResultsMessage))).exists());
  },

  closeInstanceDetailPane() {
    cy.do(instanceDetailsSection.find(Button({ icon: 'times' })).click());
    cy.expect(instanceDetailsSection.absent());
    cy.expect(tagsPane.absent());
  },

  verifyTagCount(count = '0') {
    cy.expect(tagsButton.find(HTML(including(count))).exists());
  },

  addTag(tag) {
    cy.intercept('PUT', '**/inventory/instances/**').as('addTag');
    cy.do(MultiSelect({ id: 'input-tag' }).fillIn(tag));
    cy.wait(500);
    cy.do(MultiSelectOption(including(tag)).click());
    cy.wait('@addTag');
    cy.wait(500);
  },

  verifyTagsView() {
    cy.expect(tagsPane.exists());
    // needs some waiting until request payload is gathered
    // otherwise, UI throws "Permissions" error
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1200);
  },

  closeTagsPane() {
    cy.do(
      tagsPane
        .find(PaneHeader())
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.wait(1000);
    cy.expect(tagsPane.absent());
  },

  openTagsField() {
    cy.do(tagsButton.click());
  },

  checkTagsCounter(count) {
    cy.expect(tagsButton.find(HTML(`${count}`)).exists());
  },

  verifyInstanceDetailsView() {
    cy.expect(instanceDetailsSection.exists());
  },

  selectFoundInstance(instanceTitle) {
    cy.do(MultiColumnListCell({ row: 0, content: instanceTitle }).click());
  },

  selectFoundItem(callNumber, suffix) {
    const locator = suffix ? `${callNumber} ${suffix}` : `${callNumber}`;
    cy.do(Button(including(locator)).click());
  },

  selectFoundItemFromBrowseResultList(value) {
    cy.do(Button(including(value)).click());
    cy.expect(instanceDetailsSection.exists());
  },

  selectFoundItemFromBrowse(value) {
    cy.do(Button(including(value)).click());
  },

  verifyInstanceDisplayed(instanceTitle, byInnerText = false) {
    if (byInnerText) {
      cy.expect(MultiColumnListCell({ innerText: instanceTitle }).exists());
    } else {
      cy.expect(MultiColumnListCell({ content: instanceTitle }).exists());
    }
  },

  verifyShelvingOrder(val) {
    cy.get('#input-inventory-search-qindex').then((elem) => {
      expect(elem.text()).to.include('Effective call number (item), shelving order');
    });
    cy.expect(inventorySearchAndFilter.has({ value: val }));
  },

  verifySearchOptionAndQuery(searchOption, queryValue) {
    cy.get('#input-inventory-search-qindex').then((elem) => {
      expect(elem.text()).to.include(searchOption);
    });
    cy.expect(inventorySearchAndFilter.has({ value: including(queryValue) }));
  },

  verifyPanesExist() {
    cy.expect(paneFilterSection.exists());
    cy.expect(paneResultsSection.exists());
  },

  verifySearchOptionIncluded(searchOption, optionShown = true) {
    if (optionShown) cy.expect(searchTypeDropdown.has({ content: including(searchOption) }));
    else cy.expect(searchTypeDropdown.has({ content: not(including(searchOption)) }));
  },

  verifyDefaultSearchOptionSelected(defaultSearchOptionValue) {
    cy.expect(searchTypeDropdown.has({ checkedOptionText: defaultSearchOptionValue }));
  },

  clickSearchOptionSelect() {
    cy.do(searchTypeDropdown.click());
  },

  selectViewHoldings: () => cy.do(viewHoldingButton.click()),

  filterItemByStatisticalCode: (code) => {
    cy.do(Button({ id: 'accordion-toggle-button-itemsStatisticalCodeIds' }).click());
    // need to wait until data will be loaded
    cy.wait(ONE_SECOND);
    cy.do(MultiSelect({ id: 'itemsStatisticalCodeIds-multiselect' }).fillIn(code));
    // need to wait until data will be loaded
    cy.wait(ONE_SECOND);
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption(including(code)))
        .click(),
    );
    cy.wait(ONE_SECOND);
  },

  fillInBrowseSearch(searchValue) {
    cy.do([browseSearchInputField.fillIn(searchValue)]);
  },

  fillInSearchQuery(searchValue, { directInput = false } = {}) {
    if (directInput) {
      /*
        Required for very large queries - usual methods too slow (test may hang for 1+ mins).
        Setting input value directly, without simulating user input.
        Using native input value setter to trigger input event correctly.
      */
      cy.get('#input-inventory-search').then(($textarea) => {
        const textarea = $textarea[0];
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value',
        ).set;
        nativeInputValueSetter.call(textarea, searchValue);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
    } else {
      cy.do([inventorySearchAndFilter.fillIn(searchValue)]);
    }
  },

  browseSearch(searchValue) {
    cy.do([browseSearchInputField.fillIn(searchValue), searchButton.click()]);
  },

  clickEditInstance() {
    cy.do([instanceDetailsSection.find(actionsButton).click(), editInstanceButton.click()]);
  },

  verifyActionButtonOptions() {
    cy.do(paneResultsSection.find(actionsButton).click());
    cy.expect([
      Button(including('New')).exists(),
      DropdownMenu().find(HTML('Show columns')).exists(),
    ]);
  },

  verifyActionButtonNotExists() {
    cy.expect(paneResultsSection.find(actionsButton).absent());
  },

  verifyActionButtonNotExistsInBrowseMode() {
    cy.expect(inventorySearchResultsPane.find(actionsButton).absent());
  },

  verifyNoExportJsonOption() {
    paneResultsSection.find(actionsButton);
    cy.expect(Button('Export instances (JSON)').absent());
  },

  filterHoldingsByPermanentLocation: (location) => {
    cy.do(Button({ id: 'accordion-toggle-button-holdingsPermanentLocation' }).click());
    // need to wait until data will be loaded
    cy.wait(ONE_SECOND);
    cy.do(MultiSelect({ id: 'holdingsPermanentLocation-multiselect' }).fillIn(location));
    // need to wait until data will be loaded
    cy.wait(ONE_SECOND);
  },

  checkRowsCount: (expectedRowsCount) => {
    cy.expect([
      instancesList.find(MultiColumnListRow({ index: expectedRowsCount - 1 })).exists(),
      instancesList.find(MultiColumnListRow({ index: expectedRowsCount })).absent(),
    ]);
  },

  switchToSearchTab() {
    cy.do(searchToggleButton.click());
    cy.expect(effectiveLocationInput.exists());
  },

  verifySearchToggleButtonSelected: () => cy.expect(searchToggleButton.has({ default: false })),
  verifySearchButtonDisabled: (isDisabled = true) => cy.expect(searchButton.has({ disabled: isDisabled })),
  verifyResetAllButtonDisabled: (isDisabled = true) => cy.expect(resetAllBtn.has({ disabled: isDisabled })),
  verifyPreviouseButtonDisabled: (isDisabled = true) => cy.expect(previousButton.has({ disabled: isDisabled })),
  verifyNextButtonDisabled: (isDisabled = true) => cy.expect(nextButton.has({ disabled: isDisabled })),

  verifyBrowseInventorySearchResults({ records = [] } = {}) {
    cy.expect(inventorySearchResultsPane.exists());

    records.forEach((record) => {
      cy.expect(
        inventorySearchResultsPane
          .find(
            MultiColumnListCell({ innerHTML: including(`<strong>${record.callNumber}</strong>`) }),
          )
          .exists(),
      );
    });
  },

  verifySearchAndResetAllButtonsDisabled(state) {
    cy.expect([
      Section({ id: 'browse-inventory-filters-pane' }).find(searchButton).has({ disabled: state }),
      Section({ id: 'browse-inventory-filters-pane' }).find(resetAllBtn).has({ disabled: state }),
    ]);
  },

  verifyNoRecordsFound() {
    cy.expect([
      paneResultsSection.find(HTML(including('No results found for'))).exists(),
      instancesList.absent(),
    ]);
  },

  verifyResultListExists(isExist = true) {
    cy.expect(isExist ? instancesList.exists() : instancesList.absent());
  },

  verifyInstanceDetailsViewAbsent() {
    cy.expect(instanceDetailsSection.absent());
  },

  searchByStatus(status) {
    cy.do([
      Button({ id: 'accordion-toggle-button-itemStatus' }).click(),
      MultiSelect({ id: 'itemStatus-multiselect' }).open(),
      MultiSelectMenu()
        .find(MultiSelectOption(including(status)))
        .click(),
    ]);
  },

  selectBrowseOption(option) {
    cy.do(browseSearchAndFilterInput.choose(option));
  },

  selectBrowseOptionFromCallNumbersGroup(option) {
    cy.get('optgroup[label="Call numbers (item)"]')
      .contains('option', option)
      .then((optionToSelect) => {
        cy.get('select').select(optionToSelect.val());
      });
  },

  selectBrowseOptionFromClassificationGroup(option) {
    cy.get('optgroup[label="Classification (instance)"]')
      .contains('option', option)
      .then((optionToSelect) => {
        cy.get('select').select(optionToSelect.val());
      });
  },

  checkSearchQueryText(text) {
    cy.expect(keywordInput.has({ value: text }));
  },

  browseOptionsDropdownIncludesOptions(options) {
    const browseOptionsDropdown = Select('Search field index');
    options.forEach((name) => {
      cy.expect(browseOptionsDropdown.has({ content: including(name) }));
    });
  },

  validateSearchTabIsDefault() {
    cy.do(
      searchToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  validateBrowseToggleIsSelected() {
    cy.do(
      browseToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  verifySearchAndFilterPane() {
    this.validateSearchTabIsDefault();
    this.instanceTabIsDefault();
    this.searchTypeDropdownDefaultValue(searchInstancesOptions[0]);
    this.verifySearchFieldIsEmpty();
    cy.expect([
      searchToggleButton.exists(),
      browseButton.exists(),
      holdingsToggleButton.exists(),
      itemToggleButton.exists(),
      searchButton.has({ disabled: true }),
      resetAllButton.has({ disabled: true }),
      effectiveLocationInput.has({ open: false }),
      languageInput.has({ open: false }),
      resourceTypeAccordion.has({ open: false }),
      formatAccordion.has({ open: false }),
      modeOfIssuanceAccordion.has({ open: false }),
      natureOfContentAccordion.has({ open: false }),
      supressFromDiscoveryAccordion.has({ open: false }),
      statisticalCodeAccordionInstanceToggle.has({ open: false }),
      dateCreatedAccordion.has({ open: false }),
      dateUpdatedAccordion.has({ open: false }),
      instanceStatusAccordion.has({ open: false }),
      sourceAccordion.has({ open: false }),
      tagsAccordion.has({ open: false }),
    ]);
  },

  verifySearchAndFilterPaneBrowseToggle() {
    this.verifyKeywordsAsDefault();
    this.verifyBrowseResultsEmptyPane();
    cy.expect([
      searchButton.has({ disabled: true }),
      resetAllBtn.has({ disabled: true }),
      actionsButton.absent(),
    ]);
  },

  searchTypeDropdownDefaultValue(value) {
    cy.expect(searchTypeDropdown.has({ checkedOptionText: value }));
  },

  verifySearchFieldIsEmpty() {
    cy.expect(keywordInput.has({ value: '' }));
  },

  verifyAccordionExistance(accordionName, isShown = true) {
    if (isShown) cy.expect(Accordion(accordionName).exists());
    else cy.expect(Accordion(accordionName).absent());
  },

  verifyAccordionByNameExpanded(accordionName, status = true) {
    cy.expect(Accordion(accordionName).has({ open: status }));
  },

  clickAccordionByName(accordionName) {
    cy.do(Accordion(accordionName).clickHeader());
  },

  // To be removed after the checkboxes turn into a MultiSelect
  verifyFilterOptionCount(accordionName, optionName, expectedCount) {
    cy.expect(
      Accordion(accordionName)
        .find(
          HTML({ className: including('checkbox---'), text: `${optionName}\n${expectedCount}` }),
        )
        .exists(),
    );
  },

  verifyMultiSelectFilterOptionCount(accordionName, optionName, expectedCount) {
    const multiSelect = paneFilterSection.find(Accordion(accordionName)).find(MultiSelect());
    const escapedValue = optionName.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    cy.do(multiSelect.open());
    cy.expect(
      multiSelect
        .find(MultiSelectOption(matching(new RegExp(`^${escapedValue}\\(\\d+\\)$`))))
        .has({ totalRecords: expectedCount }),
    );
  },

  verifyCheckboxInAccordion(accordionName, checkboxValue, isChecked = null) {
    cy.expect(Accordion(accordionName).find(Checkbox(checkboxValue)).exists());
    if (isChecked !== null) cy.expect(Accordion(accordionName).find(Checkbox(checkboxValue)).has({ checked: isChecked }));
  },

  verifyTextFieldInAccordion(accordionName, textFieldValue) {
    cy.expect(
      Accordion(accordionName)
        .find(TextField({ value: including(textFieldValue) }))
        .exists(),
    );
  },

  verifyNameTypeOption(option) {
    cy.do(nameTypeAccordion.find(Button({ ariaLabel: 'open menu' })).click());
    cy.expect(nameTypeAccordion.find(MultiSelectOption(including(option))).exists());
  },

  // To be removed after the checkboxes turn into a MultiSelect
  selectOptionInExpandedFilter(accordionName, optionName, selected = true) {
    const checkbox = Accordion(accordionName).find(Checkbox(optionName));
    cy.do(checkbox.click());
    // wait for facet options to reload in all facets
    cy.wait(ONE_SECOND);
    cy.expect(checkbox.has({ checked: selected }));
  },

  selectMultiSelectFilterOption(accordionName, optionName) {
    const multiSelect = paneFilterSection.find(Accordion(accordionName)).find(MultiSelect());
    const escapedValue = optionName.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    cy.do(multiSelect.open());
    cy.wait(1_000);
    cy.do(multiSelect.select([matching(new RegExp(`^${escapedValue}\\(\\d+\\)$`))]));
  },

  checkSearchButtonEnabled() {
    cy.expect(searchButton.has({ disabled: false }));
  },

  varifyInstanceKeyDetails(instanceData) {
    cy.wait(4000);
    cy.expect([
      Section({ id: 'acc01' }).find(KeyValue('Instance HRID')).has({ value: instanceData.hrid }),
      Section({ id: 'acc01' }).find(KeyValue('Source')).has({ value: instanceData.source }),
      Section({ id: 'acc02' }).find(KeyValue('Resource title')).has({ value: instanceData.title }),
    ]);
  },

  expandAccordion(accordionName) {
    cy.do(paneFilterSection.find(Accordion(accordionName)).clickHeader());
    cy.expect(paneFilterSection.find(Accordion(accordionName)).has({ open: true }));
  },

  checkOptionsWithCountersExistInAccordion(accordionName) {
    cy.do(Accordion(accordionName).find(MultiSelect()).open());
    cy.expect(
      Accordion(accordionName)
        .find(MultiSelectOption({ text: matching(/.{1,}(\d{1,})/) }))
        .exists(),
    );
  },

  checkBrowseOptionDropdownInFocus() {
    cy.expect(Select({ id: 'input-record-search-qindex' }).has({ focused: true }));
  },

  clickEffectiveLocationAccordionToggleButton() {
    cy.do(effectiveLocationInput.clickHeader());
  },

  clickEffectiveLocationAccordionInput() {
    cy.get('#callNumbersEffectiveLocation-multiselect-input').click();
  },

  checkEffectiveLocationAccordionInputInFocus() {
    cy.expect(TextField({ type: 'search' }).has({ focused: true }));
  },

  checkBrowseSearchInputFieldContent(text) {
    cy.expect(browseSearchInputField.has({ textContent: text }));
  },

  checkBrowseSearchInputFieldInFocus(isFocused) {
    cy.expect(browseSearchInputField.has({ focused: isFocused }));
  },

  checkSearchInputFieldInFocus(isFocused) {
    cy.expect(keywordInput.has({ focused: isFocused }));
  },

  checkBrowseInventoryResultPaneInFocus(isFocused) {
    cy.expect(
      PaneHeader({ id: 'paneHeaderbrowse-inventory-results-pane' }).has({ focused: isFocused }),
    );
  },

  checkBrowseResultListCallNumbersExists(isExist) {
    if (isExist) {
      cy.expect(browseResultList.exists());
    } else {
      cy.expect(browseResultList.absent());
    }
  },

  checkBrowseOptionSelected(option) {
    cy.expect(browseSearchAndFilterInput.has({ checkedOptionText: option }));
  },

  clearFilter(accordionName) {
    cy.intercept('GET', /\/search\/(instances|call-numbers)(\/facets)?\?.*/).as('getData');
    cy.do(
      Button({
        ariaLabel: or(
          `Clear selected filters for "${accordionName}"`,
          `Clear selected ${accordionName} filters`,
        ),
      }).click(),
    );
    cy.wait('@getData');
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

  checkSharedInstancesInResultList() {
    return cy
      .get('div[class^="mclRowContainer--"]')
      .find('[class*="mclCell-"]:nth-child(2)')
      .each(($cell) => {
        cy.wrap($cell).find('span[class*="sharedIcon"]').should('exist');
      });
  },

  checkNoSharedInstancesInResultList() {
    cy.expect(MultiColumnListCell(including('sharedIcon')).absent());
  },

  checkSharedAndLocalInstancesInResultList() {
    return cy
      .get('div[class^="mclRowContainer--"]')
      .find('[class*="mclCell-"]:nth-child(2)')
      .then(($allInstances) => {
        const totalNumberOfInstances = $allInstances.length;
        cy.wrap($allInstances)
          .find('span[class*="sharedIcon"]')
          .then(($sharedInstances) => {
            const numberOfSharedInstances = $sharedInstances.length;

            expect(totalNumberOfInstances).not.to.eq(numberOfSharedInstances);
          });
      });
  },

  selectYesfilterStaffSuppress: () => {
    cy.wait(1000);
    cy.do([
      stuffSupressAccordion.clickHeader(),
      stuffSupressAccordion.find(Checkbox({ id: 'clickable-filter-staffSuppress-true' })).click(),
    ]);
  },

  checkClassificationAllResultsDisplayed: () => {
    cy.expect(MultiColumnList({ id: 'browse-results-list-classificationAll' }).exists());
  },

  verifyBrowseResultPaneEmpty() {
    cy.expect(
      inventorySearchResultsPane.find(HTML({ className: including('noResultsMessage-') })).exists(),
    );
  },

  selectHeldByOption(tenantName, isSelected = true) {
    cy.wait(ONE_SECOND);
    cy.do(heldByAccordion.find(MultiSelect()).fillIn(tenantName));
    // need to wait until data will be loaded
    cy.wait(ONE_SECOND);
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption(including(tenantName)))
        .click(),
    );
    cy.wait(ONE_SECOND);
    this.checkHeldByOptionSelected(tenantName, isSelected);
  },

  checkHeldByOptionSelected: (tenantName, isSelected = true) => {
    if (isSelected) {
      cy.expect(
        heldByAccordion
          .find(MultiSelect())
          .find(ValueChipRoot(including(tenantName)))
          .exists(),
      );
    } else {
      cy.expect(
        heldByAccordion
          .find(MultiSelect())
          .find(ValueChipRoot(including(tenantName)))
          .absent(),
      );
    }
  },

  clickOnCloseIcon() {
    cy.wait(1000);
    cy.do(closeIconButton.click());
    cy.wait(1000);
  },

  verifyHeldByOption(option) {
    cy.do(heldByAccordion.find(Button({ ariaLabel: 'open menu' })).click());
    cy.expect(heldByAccordion.find(MultiSelectOption(including(option))).exists());
  },

  verifyDefaultSearchInstanceOptionSelected() {
    this.searchTypeDropdownDefaultValue(searchInstancesOptions[0]);
  },

  verifyResultWithDate1Found(date1Value, isFound = true) {
    const escapedDate1Value = date1Value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const targetCell = MultiColumnListCell({
      column: 'Date',
      content: matching(`^${escapedDate1Value}`),
    });
    if (isFound) cy.expect(targetCell.exists());
    else cy.expect(targetCell.absent());
  },

  toggleAccordionByName(accordionName, isOpen = true) {
    this.clickAccordionByName(accordionName);
    this.verifyAccordionByNameExpanded(accordionName, isOpen);
  },

  verifyDateRangeAccordionValues(fromDate, toDate) {
    cy.expect([
      dateRangeFromField.has({ value: fromDate }),
      dateRangeToField.has({ value: toDate }),
      dateRangeAccordion.find(filterApplyButton).exists(),
    ]);
  },

  filterByDateRange(dateFrom, dateTo, fromError, toError) {
    cy.intercept('/search/instances**').as('searchCall');
    this.toggleAccordionByName('Date range');
    cy.do([dateRangeFromField.fillIn(dateFrom), dateRangeToField.fillIn(dateTo)]);
    if (fromError !== dateOrderErrorText) this.checkDateRangeFieldsValidation(fromError, toError);
    else this.checkDateRangeFieldsValidation(false, false);
    cy.do(dateRangeAccordion.find(filterApplyButton).click());
    if (fromError !== dateOrderErrorText) this.checkDateRangeFieldsValidation(fromError, toError);
    else {
      this.checkDateRangeFieldsValidation(false, false);
      this.verifyErrorMessageInAccordion(dateRangeAccordion, dateOrderErrorText);
    }
    if (!fromError && !toError) cy.wait('@searchCall').its('response.statusCode').should('eq', 200);
    cy.wait(1000);
  },

  checkDateRangeFieldsValidation(fromError, toError) {
    cy.wait(500);
    if (fromError) this.verifyErrorMessageInTextField(dateRangeFromField, true, fromError);
    else if (fromError === false) this.verifyErrorMessageInTextField(dateRangeFromField, false);
    if (toError) this.verifyErrorMessageInTextField(dateRangeToField, true, toError);
    else if (toError === false) this.verifyErrorMessageInTextField(dateRangeToField, false);
  },

  verifyErrorMessageInTextField(textFieldInteractor, isError = true, errorText) {
    if (isError) cy.expect(textFieldInteractor.has({ error: errorText, errorBorder: true, errorIcon: true }));
    else {
      cy.expect(
        textFieldInteractor.has({ error: undefined, errorBorder: false, errorIcon: false }),
      );
    }
  },

  verifyErrorMessageInAccordion(accordionInteractor, errorText) {
    if (errorText) {
      cy.expect(accordionInteractor.find(HTML(errorText)).exists());
    }
  },

  verifyMultiSelectFilterOptionSelected(accordionName, optionName, isSelected = true) {
    const multiSelect = Accordion(accordionName).find(
      MultiSelect({ selected: including(optionName) }),
    );
    if (isSelected) cy.expect(multiSelect.exists());
    else cy.expect(multiSelect.absent());
  },

  typeValueInMultiSelectFilterFieldAndCheck(accordionName, value, isFound = true, foundCount = 1) {
    const multiSelect = Accordion(accordionName).find(MultiSelect());
    cy.do(multiSelect.fillIn(value));
    cy.wait(1000);
    if (isFound) {
      cy.expect([
        multiSelect.find(MultiSelectOption(including(value))).exists(),
        multiSelect.has({ optionsCount: foundCount }),
      ]);
    } else cy.expect(multiSelect.find(MultiSelectOption(including(value))).absent());
  },

  typeNotFullValueInMultiSelectFilterFieldAndCheck(
    accordionName,
    notFullValue,
    fullValue,
    isFound = true,
  ) {
    const multiSelect = Accordion(accordionName).find(MultiSelect());
    cy.do(multiSelect.fillIn(notFullValue));
    cy.wait(1000);
    if (isFound) {
      cy.expect([multiSelect.find(MultiSelectOption(including(fullValue))).exists()]);
    } else cy.expect(multiSelect.find(MultiSelectOption(including(fullValue))).absent());
  },

  verifyCheckboxesWithCountersExistInAccordion(accordionName) {
    cy.expect(
      Accordion(accordionName)
        .find(Checkbox({ label: matching(/.+\d+$/) }))
        .exists(),
    );
  },

  verifyOptionAvailableMultiselect(
    accordionName,
    optionName,
    isShown = true,
    { checkIncluding = false } = {},
  ) {
    const accordion = paneFilterSection.find(Accordion(accordionName));
    const escapedValue = optionName.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    const option = checkIncluding
      ? accordion.find(MultiSelectOption(including(`${optionName} (`)))
      : accordion.find(MultiSelectOption(matching(escapedValue)));
    cy.do(accordion.find(MultiSelect()).open());
    if (isShown) cy.expect(option.exists());
    else cy.expect(option.absent());
  },

  getAllValuesFromColumn(columnIndex) {
    return cy
      .wait(3000)
      .get('[class^="mclRow-"]')
      .then(($rows) => {
        const cellValues = [];
        $rows.each((_, row) => {
          const cell = row.querySelectorAll('[class^="mclCell-"]')[columnIndex];
          if (cell) {
            const cellText = cell.textContent.replace('would be here', '').trim();
            cellValues.push(cellText);
          }
        });
        return cellValues;
      });
  },

  checkAllValuesInColumnSorted(columnIndex) {
    this.getAllValuesFromColumn(columnIndex).then((cellValues) => {
      cy.expect(cellValues).to.deep.equal(cellValues.sort());
    });
  },

  clearBrowseInputField() {
    cy.do(browseSearchInputField.focus());
    cy.do(browseSearchInputField.find(clearIcon).click());
    this.checkBrowseSearchInputFieldContent('');
  },

  deleteQueryUsingButton(count, key) {
    // transfer number of chars for deleting and keyboard button
    cy.get('#input-record-search')
      .focus()
      .invoke('val')
      .then((initialValue) => {
        let expectedValue;
        let cursorPos;
        if (key === '{del}') {
          cursorPos = 0; // set cursor in the begining of query, before chars
          expectedValue = initialValue.substring(count);
        } else if (key === '{backspace}') {
          cursorPos = count; // set cursor after specified char of query
          expectedValue = initialValue.substring(count);
        }

        cy.get('#input-record-search')
          .focus()
          .then((input) => input[0].setSelectionRange(cursorPos, cursorPos))
          .type(key.repeat(count))
          .should('have.value', expectedValue)
          .then((input) => {
            const el = input[0];
            expect(el.selectionStart, 'cursor position (start)').to.eq(0);
            expect(el.selectionEnd, 'cursor position (end)').to.eq(0);
          });
      });
  },

  verifyBrowseFacetsNotDisplayed() {
    cy.expect(searchAndFilterSection.find(Accordion()).absent());
  },

  clearSearchInputField() {
    cy.do(inventorySearchAndFilter.focus());
    cy.do(inventorySearchAndFilter.find(clearIcon).click());
    this.checkSearchQueryText('');
  },

  checkClearIconShownInSearchField(isShown = true) {
    if (isShown) cy.expect(inventorySearchAndFilter.find(clearIcon).exists());
    else cy.expect(inventorySearchAndFilter.find(clearIcon).absent());
  },

  focusOnSearchField() {
    cy.do(inventorySearchAndFilter.focus());
  },

  validateSearchTableColumnsShown(
    columnHeaders = Object.values(INVENTORY_COLUMN_HEADERS),
    isShown = true,
  ) {
    const headers = Array.isArray(columnHeaders) ? columnHeaders : [columnHeaders];
    headers.forEach((header) => {
      if (isShown) cy.expect(paneResultsSection.find(MultiColumnListHeader(header)).exists());
      else cy.expect(paneResultsSection.find(MultiColumnListHeader(header)).absent());
    });
  },

  verifyWarningIconForSearchResult: (cellContent, hasWarningItem = true) => {
    const targetCell = MultiColumnListCell({ content: cellContent });
    if (hasWarningItem) cy.expect(targetCell.find(Icon({ warning: true })).exists());
    else {
      cy.expect([targetCell.exists(), targetCell.find(Icon({ warning: true })).absent()]);
    }
  },

  verifyEveryRowContainsLinkButtonInBrowse(columnIndex = 0) {
    cy.then(() => inventorySearchResultsPane.find(MultiColumnList()).rowCount()).then(
      (rowsCount) => {
        if (rowsCount) {
          for (let i = 0; i < rowsCount; i++) {
            const targetCell = inventorySearchResultsPane
              .find(MultiColumnList())
              .find(MultiColumnListCell({ columnIndex, row: i }));
            cy.expect(
              targetCell.has({
                innerHTML: or(including('href="/inventory'), including('would be here')),
              }),
            );
          }
        }
      },
    );
  },

  validateColumnValueForSearchResult(columnName, expectedValue, rowIndex = 0) {
    const targetCell = instancesList.find(
      MultiColumnListCell({ column: columnName, row: rowIndex }),
    );
    cy.expect(targetCell.has({ content: expectedValue }));
  },

  verifySearchErrorText(query) {
    cy.expect(paneResultsSection.find(HTML(getSearchErrorText(query))).exists());
  },

  clickSearchAndVerifySearchExecuted() {
    cy.intercept('/search/instances*').as('getInstances');
    this.clickSearch();
    cy.wait('@getInstances').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      if (interception.response.body.totalRecords === 0) {
        this.verifyNoRecordsFound();
      } else {
        this.verifyResultListExists();
      }
    });
  },

  verifyNumberOfSelectedOptionsInMultiSelectFilter(accordionName, selectedCount) {
    const multiSelect = Accordion(accordionName).find(MultiSelect());
    cy.expect(multiSelect.has({ selectedCount }));
  },

  resizeSearchInputField(height, width) {
    cy.do(inventorySearchAndFilter.resize(height, width));
  },

  verifySearchInputFieldSize(height = null, width = null) {
    if (height !== null) cy.expect(inventorySearchAndFilter.has({ height }));
    if (width !== null) cy.expect(inventorySearchAndFilter.has({ width }));
  },

  resizeBrowseInputField(height, width) {
    cy.do(browseSearchInputField.resize(height, width));
  },

  verifyBrowseInputFieldSize(height = null, width = null) {
    if (height !== null) cy.expect(browseSearchInputField.has({ height }));
    if (width !== null) cy.expect(browseSearchInputField.has({ width }));
  },

  checkClearIconShownInBrowseField(isShown = true) {
    if (isShown) cy.expect(browseSearchInputField.find(clearIcon).exists());
    else cy.expect(browseSearchInputField.find(clearIcon).absent());
  },

  focusOnBrowseField() {
    cy.do(browseSearchInputField.focus());
  },

  verifyBrowseResultListExists(isExist = true) {
    cy.expect(isExist ? anyBrowseResultList.exists() : anyBrowseResultList.absent());
  },

  verifyUriCharLimitMessageAndCallout() {
    cy.expect(paneResultsSection.find(HTML({ text: uriCharLimitErrorText })).exists());
    InteractorsTools.checkCalloutErrorMessage(uriCharLimitErrorText);
  },

  verifyNoCheckboxesInAccordion(accordionName) {
    cy.expect([
      Accordion(accordionName).find(Checkbox()).absent(),
      Accordion(accordionName).find(HTML('No matching options')).exists(),
    ]);
  },

  verifySharedIconForResult: (title, isShared = true) => {
    const targetIcon = MultiColumnListCell({ content: title }).find(Icon({ shared: true }));
    if (isShared) cy.expect(targetIcon.exists());
    else cy.expect(targetIcon.absent());
  },

  verifyCheckboxOptionPresentInAccordion(accordionName, optionName, isShown = true) {
    const option = Accordion(accordionName).find(Checkbox(optionName));
    if (isShown) cy.expect(option.exists());
    else cy.expect(option.absent());
  },

  selectEcsLocationFilterOption(locationAccordionName, locationName, locationTenantName) {
    const multiSelect = paneFilterSection
      .find(Accordion(locationAccordionName))
      .find(MultiSelect());
    const escapedLocation = locationName.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedTenant = locationTenantName.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    cy.do(multiSelect.open());
    cy.wait(1_000);
    cy.do(
      multiSelect.select([
        matching(new RegExp(`^${escapedLocation}(?: \\(${escapedTenant}\\))?\\(\\d+\\)$`)),
      ]),
    );
  },

  checkClearIconShownInAccordionHeader(accordionName, isShown = true) {
    const targetIcon = Button({
      ariaLabel: or(
        `Clear selected filters for "${accordionName}"`,
        `Clear selected ${accordionName} filters`,
      ),
    });
    if (isShown) cy.expect(targetIcon.exists());
    else cy.expect(targetIcon.absent());
  },
};
