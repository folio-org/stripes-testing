import { Accordion, Button, FieldSet, KeyValue, Modal, PaneContent, MultiSelect, NavListItem, RadioButton, Section, Select, Spinner, TextArea, TextField } from '../../../interactors';
import eholdingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import topMenu from '../../support/fragments/topMenu';
import dateTools from '../../support/utils/dateTools';

const editButton = Button('Edit');
const actionsButton = Button('Actions');
const searchButton = Button('Search');
const description = TextArea({ name: 'description' });
const SaveAndClose = Button('Save & close');
const randomValue = Math.floor(Math.random() * 2);
const availableProxies = ['Inherited - None', 'FOLIO-Bugfest', 'EZProxy'];
const SearchButton = Section({ id: 'providerShowProviderList' }).find(Button({ ariaLabel: 'Toggle filters pane' }));
const iconSearch = Button({ icon: 'search' });
const randomNumber = Math.floor(Math.random(9000) * 1000) + 1000;
const proxySelect = Select({ id: 'eholdings-proxy-id' });
const selectionStatusAccordion = Accordion({ id: 'accordion-toggle-button-filter-packages-selected' });
const selectionStatusSection = Section({ id: 'filter-packages-selected' });
const accordianClick = Button({ id: 'accordion-toggle-button-providerShowProviderList' });
const patronRadioButton = FieldSet('Show titles in package to patrons').find(RadioButton({ checked: false }));
const tagsClick = Button({ id: 'accordion-toggle-button-providerShowTags' });
const providerClick = Button({ id: 'accordion-toggle-button-providerShowProviderSettings' });
const notesClick = Button({ id: 'accordion-toggle-button-providerShowNotes' });
const packagesClick = Button({ id: 'accordion-toggle-button-providerShowProviderInformation' });

export default {
  packageAccordianClick() {
    cy.expect(accordianClick.exists());
    cy.do([accordianClick.click(),
      accordianClick.click()]);
    cy.expect(Spinner().absent());
  },
  packageButtonClick(name, open) {
    cy.expect(Button(name).exists());
    cy.do(Button(name).click());
    cy.expect([accordianClick.has({ ariaExpanded: open }),
      tagsClick.has({ ariaExpanded: open }),
      providerClick.has({ ariaExpanded: open }),
      notesClick.has({ ariaExpanded: open }),
      packagesClick.has({ ariaExpanded: open })]);
  },

  switchToPackage() {
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('JSTOR');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  verifyPackage() {
    cy.expect(PaneContent({ id: 'search-results-content' }).exists());
  },
  switchToPackages() {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsProvidersSearch.byProvider('Gale Cengage');
  },
  switchToPackageAndSearch() {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('Wiley Online Library');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  editActions: () => {
    cy.expect(Spinner().absent());
    cy.do(actionsButton.click());
    cy.expect(editButton.exists());
    cy.do(editButton.click());
  },

  getAlternateTitles: () => cy.then(() => KeyValue('Alternate title(s)').value()),
  alternativesTitles() {
    this.getAlternateTitles().then(val => {
      expect(val).to.include(';');
    });
  },

  searchActions() {
    cy.expect(searchButton.exists());
    cy.do(searchButton.click());
  },

  verifyFilterPackages() {
    cy.expect(Section({ id: 'titleShowPackages' }).exists());
  },

  patronRadioButton: () => {
    cy.expect(patronRadioButton.exists());
    cy.do(patronRadioButton.click());
  },


  changeProxy: () => {
    cy.get('select#eholdings-proxy-id option:selected')
      .invoke('text')
      .then((text) => {
        const options = availableProxies.filter((option) => option !== text);
        cy.do(proxySelect.choose(options[randomValue]));
      });
  },

  editDateRange: () => {
    cy.expect(Spinner().absent());
    cy.do([
      TextField({ id: 'begin-coverage-0' }).fillIn(
        dateTools.getTomorrowDayDateForFiscalYear(randomValue)
      ),
      TextField({ id: 'end-coverage-0' }).fillIn(
        dateTools.getDayAfterTomorrowDayDateForFiscalYear(randomValue)
      ),
      SaveAndClose.click(),
    ]);
  },

  dropdownValuesSelect(names) {
    cy.expect(MultiSelect().exists());
    cy.do(MultiSelect().select(names));
  },

  bySelectionStatus(selectionStatus) {
    cy.expect(selectionStatusAccordion.exists());
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion
      .find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },

  bySelectionStatusSection(selectionStatus) {
    cy.expect(selectionStatusSection.exists());
    cy.do(selectionStatusSection
      .find(RadioButton(selectionStatus)).click());
  },

  bySelectionStatusOpen(selectionStatus) {
    cy.do(selectionStatusSection.find(Button('Selection status')).click());
    cy.do(selectionStatusSection
      .find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },

  editSchedule({ data }) {
    cy.do([
      NavListItem(data.name).click(),
      Button('Actions').click(),
      Button('Edit').click(),
      description.fillIn(data.description),
      SaveAndClose.click()
    ]);
  },

  packageSearch() {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('VLeBooks');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  packageButton: () => {
    cy.expect(SearchButton.exists());
    cy.do(SearchButton.click());
  },

  searchButton() {
    cy.expect(iconSearch.exists());
    cy.do(iconSearch.click());
  },
  modelSearch() {
    cy.do(Modal({ id: 'package-filter-modal' }).find(Button('Search').click()));
  },
  providerToken() {
    cy.do(TextArea({ name: 'providerTokenValue' }).fillIn(`Test${randomNumber}`));
    cy.expect(SaveAndClose.exists());
    cy.do(SaveAndClose.click());
  },
  getProxyValue: () => cy.then(() => KeyValue('Proxy').value()),
  verifyProxy() {
    this.getProxyValue().then((val) => {
      // eslint-disable-next-line no-unused-expressions
      expect(val).to.be.exist;
    });
  },

  getToken: () => cy.then(() => KeyValue('Provider token').value()),
  checkToken() {
    this.getToken().then((val) => {
      // eslint-disable-next-line no-unused-expressions
      expect(val).to.be.exist;
    });
  },

  getAlternateRadio: () => cy.then(() => KeyValue('Show titles in package to patrons').value()),
  alternativeRadio() {
    this.getAlternateRadio().then((val) => {
      const radioArray = ['Yes', 'No'];
      const newRadioArray = radioArray.filter((x) => !x.includes(val));
      expect(val).to.not.equal(newRadioArray[0]);
    });
  },

  getDatesValue: () => cy.then(() => KeyValue('Custom coverage dates').value()),
  alternativeDates() {
    this.getDatesValue().then((val) => {
      // eslint-disable-next-line no-unused-expressions
      expect(val).to.be.exist;
    });
  },
};
