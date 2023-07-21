import { Button, Select, Spinner, MultiSelect, RadioButton, Accordion, NavListItem, TextField, TextArea, FieldSet, Section, KeyValue } from '../../../interactors';
import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import TopMenu from '../../support/fragments/topMenu';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eholdingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import dateTools from '../../support/utils/dateTools';

const RandomNumber = Math.floor(Math.random(9000) * 1000) + 1000

const editButton = Button('Edit');
const actionsButton = Button('Actions');
const searchButton = Button('Search');
const desc = TextArea({ name: 'description' });
const SaveAndClose = Button('Save & close');
const RandomValue = Math.floor(Math.random() * 2);
const availableProxies = ['Inherited - None', 'FOLIO-Bugfest', 'EZProxy'];
const SearchButton = Section({ id: 'providerShowProviderList' }).find(Button({ ariaLabel: 'Toggle filters pane' }));
const proxySelect = Select({ id: 'eholdings-proxy-id' });
const selectionStatusAccordion = Accordion({ id: 'accordion-toggle-button-filter-packages-selected' });
const selectionStatusSection = Section({ id: 'filter-packages-selected' });
const iconSearch = Button({ icon: 'search' });
const accordianClick = Button({ id: 'accordion-toggle-button-providerShowProviderList' });
const patronRadioButton = FieldSet('Show titles in package to patrons').find(RadioButton({ checked: false }));

// const availableProxies = [
//     'Inherited - None',
//     'FOLIO-Bugfest',
//     'EZProxy'
// ];


export default {
  PackageAccordianClick() {
    cy.expect(accordianClick.exists());
    cy.do(accordianClick.click());
  },

  PackageButtonClick(name) {
    cy.expect(Button(name).exists());
    cy.do(Button(name).click());
  },

  SwitchToPackage() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('JSTOR');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  SwitchTopackage() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsProvidersSearch.byProvider('Gale Cengage');
    // eholdingsPackagesSearch.bySelectionStatus('Selected')
  },
  SwitchToPackageandsearch() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('Wiley Online Library');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  editactions: () => {
    cy.expect(Spinner().absent());
    cy.do(actionsButton.click());
    cy.expect(editButton.exists());
    cy.do(editButton.click());
  },

  getAlternateTitles: () => cy.then(() => KeyValue('Alternate title(s)').value()),
  alternativesTitles() {
    this.getAlternateTitles().then(val => {
      // cy.expect(val.includes(";")).to.be.true;
      expect(val).to.include(';');
    });
  },

  searchActions() {
    cy.expect(searchButton.exists());
    cy.do(searchButton.click());
  },

  patronRadiobutton: () => {
    cy.expect(patronRadioButton.exists());
    cy.do(patronRadioButton.click());
  },

  changeProxy: () => {
    cy.get('select#eholdings-proxy-id option:selected')
      .invoke('text')
      .then((text) => {
        const options = availableProxies.filter((option) => option != text);
        cy.do(proxySelect.choose(options[RandomValue]));
      });
  },

  editDateRange: () => {
    cy.expect(Spinner().exists())
    cy.do([
      TextField({ id: 'begin-coverage-0' }).clear(),
      TextField({ id: 'end-coverage-0' }).clear(),
      TextField({ id: 'begin-coverage-0' }).fillIn(dateTools.getRandomStartDate(RandomValue)),
      TextField({ id: 'end-coverage-0' }).fillIn(dateTools.getRandomEndDate(RandomValue)),
      SaveAndClose.click(),
    ]);
  },

  DropdownValuesSelect(names) {
    cy.expect(MultiSelect().exists());
    cy.do(MultiSelect().select(names));
  },

  bySelectionStatus(selectionStatus) {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion
      .find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },
  bySelectionStatusSection(selectionStatus) {
    // cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusSection
      .find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
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
      desc.fillIn(data.description),
      SaveAndClose.click()
    ]);
  },

  packageSearch() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('VLeBooks');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  packageButton:() => {
    cy.expect(SearchButton.exists());
    cy.do(SearchButton.click());
  },
  searchButton() {
    cy.expect(iconSearch.exists());
    cy.do(iconSearch.click());
  },
  providerToken() {
    cy.do(TextArea({ name: 'providerTokenValue' }).fillIn(`Test${RandomNumber}`))
}
};
