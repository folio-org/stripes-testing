import { Button, Select, HTML, including, MultiSelect, RadioButton, Accordion, NavListItem, TextField, TextArea, FieldSet, Section } from '../../../interactors';

import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import TopMenu from '../../support/fragments/topMenu';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eholdingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';


const editButton = Button('Edit');
const actionsButton = Button('Actions');
const searchButton = Button('Search');
const alternativesTitles = "//div[text()='Alternate title(s)']/following-sibling::div";
const desc = TextArea({ name: 'description' });
const SaveAndClose = Button('Save & close');
const Wait = () => { cy.wait(2000); };
const RandomValue = Math.floor(Math.random() * 2);
const availableProxies = ['Inherited - None', 'FOLIO-Bugfest', 'EZProxy'];
const SearchButton = Section({ id: 'providerShowProviderList' }).find(Button({ ariaLabel: 'Toggle filters pane' }));


// const availableProxies = [
//     'Inherited - None',
//     'FOLIO-Bugfest',
//     'EZProxy'
// ];

const proxySelect = Select({ id: 'eholdings-proxy-id' });
const selectionStatusAccordion = Accordion({ id: 'accordion-toggle-button-filter-packages-selected' });
const selectionStatusSection = Section({ id: 'filter-packages-selected' });


export default {
  PackageAccordianClick() {
    cy.do([Button({ id: 'accordion-toggle-button-providerShowProviderList' }).click()]);
  },
  PackageButtonClick(name) {
    cy.do([Button(name).click()]);
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
    cy.wait(2000);
    cy.do(actionsButton.click());
    cy.wait(2000);
    cy.do(editButton.click());
  },

  alternativesTitles: () => {
    cy.do([
      cy.xpath(alternativesTitles).then((value) => {
        cy.log(value.text());
        cy.expect(value.text()).to.include(';');
      }),
    ]);
  },
  searchActions() {
    cy.do(searchButton.click());
  },

  patronRadiobutton: () => {
    cy.do([
      FieldSet('Show titles in package to patrons')
        .find(RadioButton({ checked: false }))
        .click()
    ]);
  },

  // changeproxy: () => {
  //     cy.get(selectedText).invoke("text").then((text) => {
  //             if (text === "Selected") {
  //                 editactions();
  //                 eHoldings.changeproxy();
  //                 eHoldingsProviderEdit.saveAndClose();
  //             } else {
  //                 eHoldingsPackage.addToHodlings();
  //                 eHoldings.editactions();
  //                 eHoldings.changeproxy();
  //                 eHoldingsProviderEdit.saveAndClose();
  //             }
  //         });
  // },
  changeProxy: () => {
    cy.get('select#eholdings-proxy-id option:selected')
      .invoke('text')
      .then((text) => {
        const options = availableProxies.filter((option) => option != text);
        cy.do(proxySelect.choose(options[RandomValue]));
      });
  },

  editDateRange: () => {
    cy.wait(2000);
    cy.do([
      TextField({ id: 'begin-coverage-0' }).clear(),
      TextField({ id: 'end-coverage-0' }).clear(),
      cy.wait(2000),
      TextField({ id: 'begin-coverage-0' }).fillIn(
        // dateTools.getRandomStartDate(RandomValue)
        '07/18/2023'
      ),
      TextField({ id: 'end-coverage-0' }).fillIn(
        // dateTools.getRandomEndDate(RandomValue)
        '07/19/2023'
      ),
      SaveAndClose.click(),
    ]);
  },
  radioButtonclick(title) {
    cy.do([cy.xpath(title).click({ force: true })]);
  },

  DropdownValuesSelect(names) {
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
    cy.do(SearchButton.click());

    // cy.do(Section({ id: 'providerShowProviderList' }).find(Button({ icon: 'search' })).click())
  }
};
