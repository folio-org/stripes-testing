import { HTML, including } from '@interactors/html';
import {
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  Accordion,
  Checkbox,
  TextField,
  Button,
  SearchField,
  Select,
  MultiColumnListHeader
} from '../../../../interactors';
import InventoryActions from './inventoryActions';

const effectiveLocationInput = Accordion({ id: 'effectiveLocation' });
const languageInput = Accordion({ id: 'language' });
const keywordInput = TextField({ id: 'input-inventory-search' });
const searchButton = Button('Search');
const searchTextField = TextField('Search ');

export default {
  effectiveLocation: {
    mainLibrary: { id: 'clickable-filter-effectiveLocation-main-library' }
  },
  language: {
    eng: { id: 'clickable-filter-language-english' }
  },
  getAllSearchResults: () => MultiColumnList(),
  getSearchResult: (row = 0, col = 0) => MultiColumnListCell({ 'row': row, 'columnIndex': col }),

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
    cy.wait(1000);
    cy.do(Select('Search field index').choose('Browse call numbers'));
  },

  selectBrowseSubjects() {
    // cypress can't draw selected option without wait
    cy.wait(1000);
    cy.do(Select('Search field index').choose('Browse subjects'));
  },

  browseCallNumberIsAbsent() {
    cy.expect(HTML('Browse call numbers').absent());
  },

  browseSubjectIsAbsent() {
    cy.expect(HTML('Browse subjects').absent());
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
      expect(elem.text()).to.include('Keyword (title, contributor, identifier)');
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
    cy.get('#list-inventory div[data-row-index]').then((el) => {
      const overall = el.length;
      cy.expect(Pane('Inventory').is({ subtitle: `${overall} records found${selected} records selected` }));
    });
  },

  searchByParameter: (parameter, value) => {
    cy.do(SearchField({ id: 'input-inventory-search' }).selectIndex(parameter));
    cy.do(searchTextField.fillIn(value));
    // TODO: clarify the reason of failed waiter
    // cy.intercept('/holdings-storage/holdings?*').as('getHoldings');
    // cy.intercept('/copycat/profiles?*').as('getProfiles');
    cy.do(searchButton.focus());
    cy.do(searchButton.click());
    // cy.wait(['@getHoldings', '@getProfiles']);
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
  switchToItem: () => {
    cy.do(Button({ id: 'segment-navigation-items' }).click());
  },

  switchToHoldings: () => {
    cy.do(Button({ id: 'segment-navigation-holdings' }).click());
  },

  switchToInstance: () => {
    cy.do(Button({ id: 'segment-navigation-instances' }).click());
  },

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

  verifySearchResult(cellContent) {
    cy.expect(MultiColumnListCell({ content: cellContent }).exists());
  },
};
