import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  DropdownMenu,
  Form,
  KeyValue,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectOption,
  Pane,
  SearchField,
  Section,
  Select,
  TextField,
  TextInput,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import logsViewAll from '../data_import/logs/logsViewAll';
import InventoryActions from './inventoryActions';
import InventoryInstances from './inventoryInstances';

const ONE_SECOND = 1000;
const searchAndFilterSection = Pane({ id: 'browse-inventory-filters-pane' });
const effectiveLocationInput = Accordion({ id: 'effectiveLocation' });
const sourceAccordion = Accordion('Source');
const languageInput = Accordion({ id: 'language' });
const keywordInput = TextField({ id: 'input-inventory-search' });
const searchButton = Button({ type: 'submit' });
const searchTextField = TextField('Search ');
const inventorySearchAndFilter = TextInput({ id: 'input-inventory-search' });
const inventorySearchAndFilterInput = Select({
  id: 'input-inventory-search-qindex',
});
const browseSearchAndFilterInput = Select({ id: 'input-record-search-qindex' });
const resetAllButton = Button({ id: 'clickable-reset-all' });
const resetAllBtn = Button('Reset all');
const navigationInstancesButton = Button({
  id: 'segment-navigation-instances',
});
const paneFilterSection = Section({ id: 'pane-filter' });
const paneResultsSection = Section({ id: 'pane-results' });
const instanceDetailsSection = Section({ id: 'pane-instancedetails' });
const instancesTagsSection = Section({ id: including('Tags') });
const tagsPane = Pane('Tags');
const tagsButton = Button({ id: 'clickable-show-tags' });
const tagsAccordionButton = instancesTagsSection.find(Button('Tags'));
const emptyResultsMessage = 'Choose a filter or enter a search query to show results.';
const browseButton = Button({ id: 'mode-navigation-browse' });
const viewHoldingButton = Button('View holdings');
const statisticalCodeAccordion = Accordion({ id: 'itemsStatisticalCodeIds' });
const holdingsPermanentLocationAccordion = Accordion({
  id: 'holdingsPermanentLocation',
});
const callNumberBrowsePane = Pane({ title: 'Browse inventory' });
const actionsButton = Button('Actions');
const editInstanceButton = Button('Edit instance');
const inventorySearchResultsPane = Section({ id: 'browse-inventory-results-pane' });
const nextButton = Button({ id: 'browse-results-list-callNumbers-next-paging-button' });
const previousButton = Button({ id: 'browse-results-list-callNumbers-prev-paging-button' });
const instancesList = paneResultsSection.find(MultiColumnList({ id: 'list-inventory' }));

const searchToggleButton = Button({ id: 'mode-navigation-search' });

const searchInstanceByHRID = (id) => {
  cy.do([
    Select({ id: 'input-inventory-search-qindex' }).choose('Instance HRID'),
    TextField({ id: 'input-inventory-search' }).fillIn(id),
    searchButton.click(),
  ]);
};

const searchHoldingsByHRID = (hrid) => {
  cy.do([
    Select({ id: 'input-inventory-search-qindex' }).choose('Holdings HRID'),
    TextField({ id: 'input-inventory-search' }).fillIn(hrid),
    searchButton.click(),
  ]);
  InventoryInstances.waitLoading();
};

const searchInstanceByTitle = (title) => {
  cy.do([TextField({ id: 'input-inventory-search' }).fillIn(title), searchButton.click()]);
  InventoryInstances.waitLoading();
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

  byEffectiveLocation(values) {
    cy.do(effectiveLocationInput.clickHeader());
    // wait to avoid robotic clicks
    cy.wait(2000);
    cy.do(
      effectiveLocationInput.find(Checkbox(values ?? this.effectiveLocation.mainLibrary)).click(),
    );
    cy.expect(
      effectiveLocationInput
        .find(Checkbox(values ?? this.effectiveLocation.mainLibrary))
        .has({ checked: true }),
    );
  },

  byLanguage(lang) {
    // lang: language object. Example: language.eng
    return cy.do([
      languageInput.clickHeader(),
      languageInput.find(Checkbox(lang ?? this.language.eng)).click(),
    ]);
  },

  bySource(source) {
    cy.do([sourceAccordion.clickHeader(), sourceAccordion.find(Checkbox(source)).click()]);
    cy.expect(MultiColumnListRow().exists());
  },

  byKeywords(kw = '*') {
    cy.do([keywordInput.fillIn(kw), searchButton.click()]);
    cy.expect(MultiColumnListRow().exists());
  },

  selectBrowseCallNumbers() {
    cy.do(browseButton.click());
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(ONE_SECOND);
    cy.do(Select('Search field index').choose('Call numbers (all)'));
    cy.expect(effectiveLocationInput.exists());
  },

  selectBrowseSubjects() {
    cy.do(browseButton.click());
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(ONE_SECOND);
    cy.do(Select('Search field index').choose('Subjects'));
  },

  selectBrowseContributors() {
    cy.do(browseButton.click());
    // cypress can not pick up an option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(ONE_SECOND);
    cy.do(Select('Search field index').choose('Contributors'));
  },

  selectBrowseOtherScheme() {
    cy.do(browseButton.click());
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(ONE_SECOND);
    cy.do(browseSearchAndFilterInput.choose('Other scheme'));
  },

  selectBrowseDeweyDecimal() {
    cy.do(browseButton.click());
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(ONE_SECOND);
    cy.do(browseSearchAndFilterInput.choose('Dewey Decimal classification'));
  },

  showsOnlyNameTypeAccordion() {
    cy.expect(Accordion({ id: 'nameType' }).exists());
    cy.expect(Accordion({ id: 'effectiveLocation' }).absent());
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
    cy.expect(Accordion({ id: 'effectiveLocation' }).exists());
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
    cy.expect(Accordion({ id: 'effectiveLocation' }).absent());
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
    cy.expect([
      browseSearchAndFilterInput.has({ content: including('Call numbers (all)') }),
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
    cy.do(Button({ id: 'mode-navigation-browse' }).click());
  },

  verifyCallNumberBrowseEmptyPane() {
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
    cy.expect(
      callNumberBrowsePane
        .find(MultiColumnList({ id: 'browse-results-list-callNumbers' }))
        .find(MultiColumnListCell(item))
        .exists(),
    );
  },

  saveUUIDs() {
    InventoryActions.open();
    cy.do(InventoryActions.options.saveUUIDs.click());
  },

  saveCQLQuery() {
    InventoryActions.open();
    cy.do(InventoryActions.options.saveCQLQuery.click());
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

  verifySelectedRecords(selected) {
    cy.expect(
      Pane('Inventory').is({
        subtitle: including(`records found${selected} records selected`),
      }),
    );
  },

  searchByParameter: (parameter, value) => {
    cy.do(SearchField({ id: 'input-inventory-search' }).selectIndex(parameter));
    cy.do(searchTextField.fillIn(value));
    cy.do(searchButton.focus());
    cy.do(searchButton.click());
  },
  switchToItem: () => cy.do(Button({ id: 'segment-navigation-items' }).click()),
  switchToHoldings: () => cy.do(Button({ id: 'segment-navigation-holdings' }).click()),
  switchToInstance: () => cy.do(navigationInstancesButton.click()),

  instanceTabIsDefault() {
    cy.do(
      navigationInstancesButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  browseSubjectsSearch(searchString = 'test123') {
    cy.do([
      browseButton.click(),
      TextField({ id: 'input-record-search' }).fillIn(searchString),
      searchButton.click(),
    ]);
    cy.expect(Pane({ id: 'browse-inventory-results-pane' }).find(MultiColumnListHeader()).exists());
  },

  verifySearchResult: (cellContent) => cy.expect(MultiColumnListCell({ content: cellContent }).exists()),

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
    cy.do([inventorySearchAndFilterInput.choose(searchOption), keywordInput.fillIn(text)]);
  },

  clickSearch() {
    cy.do(searchButton.click());
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
  },

  clickResetAllButton() {
    cy.do(searchAndFilterSection.find(resetAllBtn).click());
  },

  clickNextPaginationButton() {
    cy.do(inventorySearchResultsPane.find(nextButton).click());
  },

  clickPreviousPaginationButton() {
    cy.do(inventorySearchResultsPane.find(previousButton).click());
  },

  checkContributorsColumResult(cellContent) {
    cy.expect(
      MultiColumnList({ id: 'list-inventory' })
        .find(MultiColumnListCell(including(cellContent)))
        .exists(),
    );
  },

  checkMissingSearchResult(cellContent) {
    cy.expect(MultiColumnListCell({ content: cellContent }).absent());
  },

  verifyIsFilteredByTag(instanceTitle) {
    cy.expect(MultiColumnListCell({ row: 0, content: instanceTitle }).exists());
    cy.expect(MultiColumnList({ id: 'list-inventory' }).has({ rowCount: 1 }));
  },

  searchTag(tag) {
    cy.do([tagsAccordionButton.click(), instancesTagsSection.find(TextField()).fillIn(tag)]);
  },

  filterByTag(tag) {
    this.searchTag(tag);
    cy.do(instancesTagsSection.find(Checkbox(tag)).click());
  },

  verifyTagIsAbsent(tag) {
    this.searchTag(tag);
    cy.expect(HTML('No matching options').exists());
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
    cy.do([
      MultiSelect({ id: 'input-tag' }).fillIn(tag),
      MultiSelect().open(),
      MultiSelectOption(including(tag)).click(),
    ]);
    cy.wait('@addTag');
  },

  verifyTagsView() {
    cy.expect(tagsPane.exists());
    // needs some waiting until request payload is gathered
    // otherwise, UI throws "Permissions" error
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1200);
  },

  openTagsField() {
    cy.do(tagsButton.click());
  },

  verifyInstanceDetailsView() {
    cy.expect(instanceDetailsSection.exists());
  },

  selectFoundInstance(instanceTitle) {
    cy.do(MultiColumnListCell({ row: 0, content: instanceTitle }).click());
  },

  selectFoundItem(callNumber, suffix) {
    cy.do(Button(including(`${callNumber} ${suffix}`)).click());
  },

  selectFoundItemFromBrowseResultList(value) {
    cy.do(Button(including(value)).click());
    cy.expect(instanceDetailsSection.exists());
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

  verifyPanesExist() {
    cy.expect(paneFilterSection.exists());
    cy.expect(paneResultsSection.exists());
  },

  selectViewHoldings: () => cy.do(viewHoldingButton.click()),

  filterItemByStatisticalCode: (code) => {
    cy.do(Button({ id: 'accordion-toggle-button-itemsStatisticalCodeIds' }).click());
    // need to wait until data will be loaded
    cy.wait(ONE_SECOND);
    cy.do(statisticalCodeAccordion.find(TextField()).fillIn(code));
    // need to wait until data will be loaded
    cy.wait(ONE_SECOND);
    statisticalCodeAccordion.find(TextField()).click();
    cy.do(statisticalCodeAccordion.find(Checkbox(code)).click());
  },

  browseSearch(searchValue) {
    cy.do([TextField({ id: 'input-record-search' }).fillIn(searchValue), searchButton.click()]);
  },

  clickEditInstance() {
    cy.do([instanceDetailsSection.find(actionsButton).click(), editInstanceButton.click()]);
  },

  verifyActionButtonOptions() {
    cy.do(paneResultsSection.find(actionsButton).click());
    cy.expect([Button('New').exists(), DropdownMenu().find(HTML('Show columns')).exists()]);
  },

  verifyNoExportJsonOption() {
    paneResultsSection.find(actionsButton);
    cy.expect(Button('Export instances (JSON)').absent());
  },

  filterHoldingsByPermanentLocation: (location) => {
    cy.do(Button({ id: 'accordion-toggle-button-holdingsPermanentLocation' }).click());
    // need to wait until data will be loaded
    cy.wait(ONE_SECOND);
    cy.do(holdingsPermanentLocationAccordion.find(TextField()).fillIn(location));
    // need to wait until data will be loaded
    cy.wait(ONE_SECOND);
    holdingsPermanentLocationAccordion.find(TextField()).click();
    cy.do(holdingsPermanentLocationAccordion.find(Checkbox(location)).click());
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

  verifyNoRecordsFound() {
    cy.expect([
      paneResultsSection.find(HTML(including('No results found for'))).exists(),
      instancesList.absent(),
    ]);
  },

  verifyInstanceDetailsViewAbsent() {
    cy.expect(instanceDetailsSection.absent());
  },

  searchByStatus(status) {
    cy.do([Button({ id: 'accordion-toggle-button-itemStatus' }).click(), Checkbox(status).click()]);
  },

  selectBrowseOption(option) {
    cy.do(browseSearchAndFilterInput.choose(option));
  },

  checkSearchQueryText(text) {
    cy.expect(keywordInput.has({ value: text }));
  },
};
