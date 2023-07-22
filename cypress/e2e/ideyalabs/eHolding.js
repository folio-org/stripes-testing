import { Accordion, Button, FieldSet, KeyValue, Modal, MultiSelect, NavListItem, RadioButton, Section, Select, Spinner, TextArea, TextField } from "../../../interactors";

import eholdingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import TopMenu from '../../support/fragments/topMenu';
import dateTools from "../../support/utils/dateTools";

const editButton = Button('Edit');
const actionsButton = Button('Actions');
const searchButton = Button('Search');
const desc = TextArea({ name: 'description' })
const SaveAndClose = Button('Save & close')
const RandomValue = Math.floor(Math.random() * 2)
const availableProxies = ["Inherited - None", "FOLIO-Bugfest", "EZProxy"];
const SearchButton = Section({ id: 'providerShowProviderList' }).find(Button({ ariaLabel: 'Toggle filters pane' }))
const iconSearch = Button({ icon: 'search' })
const RandomNumber = Math.floor(Math.random(9000) * 1000) + 1000
const proxySelect = Select({ id: 'eholdings-proxy-id' });
const selectionStatusAccordion = Accordion({ id: 'accordion-toggle-button-filter-packages-selected' });
const selectionStatusSection = Section({ id: "filter-packages-selected" });
const accordianClick = Button({ id: 'accordion-toggle-button-providerShowProviderList' })
const patronRadioButton = FieldSet("Show titles in package to patrons").find(RadioButton({ checked: false }))


export default {
  packageAccordianClick() {
    cy.expect(accordianClick.exists())
    cy.do(accordianClick.click())
  },
  packageButtonClick(name) {
    cy.expect(Button(name).exists())
    cy.do(Button(name).click())
  },

  switchToPackage() {
    eHoldingsSearch.switchToPackages()
    eHoldingsProvidersSearch.byProvider('JSTOR')
    eholdingsPackagesSearch.bySelectionStatus('Selected')
  },

  switchToPackages() {
    cy.visit(TopMenu.eholdingsPath)
    eHoldingsProvidersSearch.byProvider('Gale Cengage')

  },
  switchToPackageAndSearch() {
    cy.visit(TopMenu.eholdingsPath)
    eHoldingsSearch.switchToPackages()
    eHoldingsProvidersSearch.byProvider('Wiley Online Library')
    eholdingsPackagesSearch.bySelectionStatus('Selected')
  },

  editActions: () => {
    cy.expect(Spinner().absent());
    cy.do(actionsButton.click())
    cy.expect(editButton.exists());
    cy.do(editButton.click());
  },

  getAlternateTitles: () => cy.then(() => KeyValue('Alternate title(s)').value()),
  alternativesTitles() {
    this.getAlternateTitles().then(val => {
      expect(val).to.include(";");
    })
  },

  searchActions() {
    cy.expect(searchButton.exists())
    cy.do(searchButton.click())
  },

  patronRadioButton: () => {
    cy.expect(patronRadioButton.exists())
    cy.do(patronRadioButton.click())
  },

  changeProxy: () => {
    cy.get("select#eholdings-proxy-id option:selected")
      .invoke("text")
      .then((text) => {
        let options = availableProxies.filter((option) => option != text);
        cy.do(proxySelect.choose(options[RandomValue]));
      })
  },

  editDateRange: () => {
    cy.expect(Spinner().absent())
    cy.do([
      TextField({ id: "begin-coverage-0" }).fillIn(dateTools.getRandomStartDate(RandomValue)),
      TextField({ id: "end-coverage-0" }).fillIn(dateTools.getRandomEndDate(RandomValue)),
      SaveAndClose.click(),
    ]);
  },
  radioButtonclick(title) {
    cy.do([cy.xpath(title).click({ force: true })])
  },

  dropdownValuesSelect(names) {
    cy.expect(MultiSelect().exists())
    cy.do(MultiSelect().select(names))
  },
  bySelectionStatus(selectionStatus) {
    cy.expect(selectionStatusAccordion.exists())
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion
      .find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },
  bySelectionStatusSection(selectionStatus) {
    cy.expect(selectionStatusSection.exists())
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
      desc.fillIn(data.description),
      SaveAndClose.click()
    ]);
  },


  packageSearch() {
    cy.visit(TopMenu.eholdingsPath)
    eHoldingsSearch.switchToPackages()
    eHoldingsProvidersSearch.byProvider('VLeBooks')
    eholdingsPackagesSearch.bySelectionStatus('Selected')
  },

  packageButton: () => {
    cy.expect(SearchButton.exists())
    cy.do(SearchButton.click())
  },

  searchButton() {
    cy.expect(iconSearch.exists())
    cy.do(iconSearch.click())

  },

  modelSearch() {
    cy.do(Modal({ id: "package-filter-modal" }).find(Button('Search').click()))
  },

  providerToken() {
    cy.do(TextArea({ name: 'providerTokenValue' }).fillIn(`Test${RandomNumber}`))
  }
}