import { HTML, including } from '@interactors/html';
import {
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  Pane,
  Accordion,
  Checkbox,
  TextField,
  Button,
  SearchField,
  Select,
  Form,
  TextInput,
  KeyValue
} from '../../../../interactors';
import InventoryActions from './inventoryActions';
import InventoryInstances from './inventoryInstances';
import logsViewAll from '../data_import/logs/logsViewAll';
import DateTools from '../../utils/dateTools';

const effectiveLocationInput = Accordion({ id: 'effectiveLocation' });
const languageInput = Accordion({ id: 'language' });
const keywordInput = TextField({ id: 'input-inventory-search' });
const searchButton = Button('Search');
const searchTextField = TextField('Search ');
const inventorySearch = TextInput({ id: 'input-inventory-search' });

const searchInstanceByHRID = (id) => {
  InventoryInstances.waitContentLoading();
  cy.do([
    Select({ id: 'input-inventory-search-qindex' }).choose('Instance HRID'),
    TextField({ id: 'input-inventory-search' }).fillIn(id),
    Button('Search').click()
  ]);
  InventoryInstances.waitLoading();
};

const searchInstanceByTitle = (title) => {
  cy.do([
    TextField({ id: 'input-inventory-search' }).fillIn(title),
    Button('Search').click()
  ]);
  InventoryInstances.waitLoading();
};

const getInstanceHRID = () => {
  return logsViewAll.getSingleJobProfile() // get the first job id from job logs list
    .then(({ id }) => {
      // then, make request with the job id
      // and get the only record id inside the uploaded file
      const queryString = 'limit=1000&order=asc';
      return cy.request({
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
          return cy.request({
            method: 'GET',
            url: `${Cypress.env('OKAPI_HOST')}/metadata-provider/jobLogEntries/${id}/records/${recordId}`,
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
  const expectedCatalogedDate = DateTools.getFormattedDate({ date: new Date() });
  // when creating mapping profile we choose instance status term as "Batch Loaded"
  // in inventory, this will be "batch" for status code and "Batch Loaded" for status term
  const expectedStatusTerm = 'Batch Loaded';
  const expectedStatusCode = 'batch';

  cy.do(MultiColumnListCell({ row: 0, columnIndex: 1 }).click());
  const catalogedDate = KeyValue('Cataloged date');
  const instanceStatusTerm = KeyValue('Instance status term');
  const instanceStatusCode = KeyValue('Instance status code');

  cy.expect(catalogedDate.has({ value: expectedCatalogedDate }));
  cy.expect(instanceStatusTerm.has({ value: expectedStatusTerm }));
  cy.expect(instanceStatusCode.has({ value: expectedStatusCode }));
};

export default {
  searchInstanceByHRID,
  searchInstanceByTitle,
  getInstanceHRID,
  checkInstanceDetails,
  getAllSearchResults: () => MultiColumnList(),
  getSearchResult: (row = 0, col = 0) => MultiColumnListCell({ 'row': row, 'columnIndex': col }),
  waitLoading: () => cy.expect([Form().find(inventorySearch).exists()]),
  browseCallNumberIsAbsent:() => cy.expect(HTML('Browse call numbers').absent()),
  browseSubjectIsAbsent:() => cy.expect(HTML('Browse subjects').absent()),

  effectiveLocation: {
    mainLibrary: { id: 'clickable-filter-effectiveLocation-main-library' }
  },

  language: {
    eng: { id: 'clickable-filter-language-english' }
  },

  selectResultCheckboxes(count) {
    const clickActions = [];
    for (let i = 0; i < count; i++) {
      clickActions.push(this.getSearchResult(i).find(Checkbox()).click());
    }
    return cy.do(clickActions);
  },

  selectSearchResultItem(indexRow = 0) {
    return cy.do(this.getSearchResult(indexRow, 0).click());
  },

  byEffectiveLocation(values) {
    return cy.do([
      effectiveLocationInput.clickHeader(),
      effectiveLocationInput.find(Checkbox(values ?? this.effectiveLocation.mainLibrary)).click()
    ]);
  },

  byLanguage(lang) {
    // lang: language object. Example: language.eng
    return cy.do([
      languageInput.clickHeader(),
      languageInput.find(Checkbox(lang ?? this.language.eng)).click()
    ]);
  },

  byKeywords(kw = '*') {
    return cy.do([
      keywordInput.fillIn(kw),
      searchButton.click(),
    ]);
  },

  selectBrowseCallNumbers() {
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    cy.do(Select('Search field index').choose('Browse call numbers'));
  },

  selectBrowseSubjects() {
    // cypress can't draw selected option without wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    cy.do(Select('Search field index').choose('Browse subjects'));
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

  verifyKeywordsAsDefault() {
    cy.get('#input-inventory-search-qindex').then(elem => {
      expect(elem.text()).to.include('Keyword (title, contributor, identifier');
    });
    cy.expect(Select({ id: 'input-inventory-search-qindex' }).exists());
  },

  verifyCallNumberBrowseEmptyPane() {
    const callNumberBrowsePane = Pane({ title: 'Browse inventory' });
    cy.expect(callNumberBrowsePane.exists());
    cy.expect(callNumberBrowsePane.has({ subtitle: 'Enter search criteria to start browsing' }));
    cy.expect(HTML(including('Browse for results entering a query or choosing a filter.')).exists());
  },

  verifyCallNumberBrowsePane() {
    const callNumberBrowsePane = Pane({ title: 'Browse inventory' });
    cy.expect(callNumberBrowsePane.exists());
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
    req.response.body.ids.forEach((elem) => { expectedUUIDs.push(elem.id); });
    return expectedUUIDs;
  },

  verifySelectedRecords(selected) {
    cy.expect(Pane('Inventory').is({ subtitle: including(`records found${selected} records selected`) }));
  },

  searchByParameter: (parameter, value) => {
    cy.do(SearchField({ id: 'input-inventory-search' }).selectIndex(parameter));
    cy.do(searchTextField.fillIn(value));
    cy.do(searchButton.focus());
    cy.do(searchButton.click());
  },
  simpleSearchByParameter: (parameter, value) => {
    cy.do(SearchField({ id: 'input-inventory-search' }).selectIndex(parameter));
    cy.do(searchTextField.fillIn(value));
    cy.do(searchButton.focus());
    cy.do(searchButton.click());
  },
  instanceSearch: (parameter, value) => {
    cy.do(SearchField({ id: 'input-inventory-search' }).selectIndex(parameter));
    cy.do(searchTextField.fillIn(value));
    cy.do(searchButton.focus());
    cy.do(searchButton.click());
  },
  switchToItem: () => cy.do(Button({ id: 'segment-navigation-items' }).click()),
  switchToHoldings: () => cy.do(Button({ id: 'segment-navigation-holdings' }).click()),
  switchToInstance: () => cy.do(Button({ id: 'segment-navigation-instances' }).click()),

  instanceTabIsDefault() {
    cy.do(
      Button({ id: 'segment-navigation-instances' }).perform(element => {
        expect(element.classList[2]).to.include('primary');
      })
    );
  },

  browseSubjectsSearch(searchString = 'test123') {
    cy.do([
      TextField({ id: 'input-inventory-search' }).fillIn(searchString),
      Button('Browse').click()
    ]);
    cy.expect(Pane({ id:'pane-results' }).find(MultiColumnListHeader()).exists());
  },

  verifySearchResult:(cellContent) => cy.expect(MultiColumnListCell({ content: cellContent }).exists()),

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
      }).then(({ body: { instances } }) => {
        return instances;
      });
  }
};
