import {
  Accordion,
  Button,
  PaneContent,
  RadioButton,
  Select,
  TextField,
  Heading,
  Section,
  KeyValue,
  including,
} from '../../../../interactors';
import EHoldingsTitles from './eHoldingsTitles';

const publicationTypeAccordion = Accordion({ id: 'filter-titles-type' });
const selectionStatusAccordion = Accordion({ id: 'filter-titles-selected' });
const searchResults = PaneContent({ id: 'search-results-content' });
const titleInfoPane = Section({ id: 'titleShowTitleInformation' });
const mainSearchOptions = {
  bySubject: 'Subject',
  byTitle: 'Title',
  byISSNISBN: 'ISSN/ISBN',
  byPublisher: 'Publisher',
};

const mainSearchBy = (searchParameter, searchValue) => {
  cy.do(Select('Select a field to search').choose(searchParameter));
  cy.expect(Select({ value: searchParameter.toLowerCase() }).exists());
  cy.do(TextField('Enter your search').fillIn(searchValue));
  cy.do(Button('Search').click());
  EHoldingsTitles.waitLoading();
};

export default {
  waitLoading: () => {
    cy.expect(searchResults.exists());
  },

  bySubject: (subjectValue) => {
    mainSearchBy(mainSearchOptions.bySubject, subjectValue);
  },
  byTitle: (titleValue) => {
    mainSearchBy(mainSearchOptions.byTitle, titleValue);
  },
  byPublicationType: (type) => {
    cy.do(publicationTypeAccordion.clickHeader());
    cy.do(publicationTypeAccordion.find(RadioButton(type)).click());
    EHoldingsTitles.waitLoading();
  },
  bySelectionStatus: (selectionStatus) => {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
    EHoldingsTitles.waitLoading();
  },
  openTitle(itemTitle) {
    cy.do(searchResults.find(Heading(itemTitle)).click());
  },
  checkTitleInfo(publicationType, titleValue) {
    cy.expect([
      titleInfoPane.find(KeyValue({ value: including(titleValue) })).exists(),
      titleInfoPane.find(KeyValue({ value: publicationType })).exists(),
    ]);
  },
  getViaApi(query) {
    return cy
      .okapiRequest({
        path: 'eholdings/titles',
        searchParams: query,
        isDefaultSearchParamsRequired: false,
      })
      .then((res) => {
        return res.body.data;
      });
  },
};
