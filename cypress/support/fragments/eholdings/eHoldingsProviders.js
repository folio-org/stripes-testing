import {
  Accordion,
  Button,
  FieldSet,
  ListItem,
  MultiSelect,
  NavListItem,
  RadioButton,
  Section,
  Select,
  Spinner,
  TextArea,
  KeyValue,
  TextField,
  including,
} from '../../../../interactors';
import dateTools from '../../utils/dateTools';
import topMenu from '../topMenu';
import eholdingsPackagesSearch from './eHoldingsPackagesSearch';
import eHoldingsProviderView from './eHoldingsProviderView';
// eslint-disable-next-line import/no-cycle
import eHoldingsProvidersSearch from './eHoldingsProvidersSearch';
import eHoldingsSearch from './eHoldingsSearch';

const resultSection = Section({ id: 'search-results' });
const description = TextArea({ name: 'description' });
const SaveAndClose = Button('Save & close');
const editButton = Button('Edit');
const actionsButton = Button('Actions');
const searchButton = Button('Search');
const packageList = Section({ id: 'packageShowTitles' });
const selectionStatusSection = Section({ id: 'filter-packages-selected' });
const RandomValue = Math.floor(Math.random() * 3) + 1;
const availableProxies = ['Inherited - None', 'FOLIO-Bugfest', 'EZProxy'];
const proxySelect = Select({ id: 'eholdings-proxy-id' });
const selectionStatusAccordion = Accordion({
  id: 'accordion-toggle-button-filter-packages-selected',
});

export default {
  waitLoading: () => {
    cy.expect(
      resultSection
        .find(
          ListItem({ className: including('list-item-'), index: 1 }).find(
            Button()
          )
        )
        .exists()
    );
  },

  viewProvider: (rowNumber = 0) => {
    cy.do(
      resultSection
        .find(
          ListItem({ className: including('list-item-'), index: rowNumber })
        )
        .find(Button())
        .click()
    );
    eHoldingsProviderView.waitLoading();
  },

  editSchedule({ data }) {
    cy.do([
      NavListItem(data.name).click(),
      Button('Actions').click(),
      Button('Edit').click(),
      description.fillIn(data.description),
      SaveAndClose.click(),
    ]);
  },

  PackageAccordianClick() {
    cy.do([
      Button({
        id: 'accordion-toggle-button-providerShowProviderList',
      }).click(),
    ]);
  },

  PackageButtonClick(name) {
    cy.do([Button(name).click()]);
  },

  SwitchToPackage() {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('JSTOR');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  SwitchToPackageandsearch() {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('Wiley Online Library');
    eholdingsPackagesSearch.bySelectionStatus('Selected');
  },

  editactions() {
    cy.expect(actionsButton.exists());
    cy.do([actionsButton.click(), editButton.click()]);
  },

  searchActions() {
    cy.do(searchButton.click());
  },

  patronRadiobutton: () => {
    cy.do([
      FieldSet('Show titles in package to patrons')
        .find(RadioButton({ checked: false }))
        .click(),
    ]);
  },

  changeProxy: () => {
    cy.do(proxySelect.choose(availableProxies[RandomValue]));
  },

  editDateRange: () => {
    cy.do([
      TextField({ id: 'begin-coverage-0' }).fillIn(
        dateTools.getRandomStartDate(RandomValue)
      ),
      TextField({ id: 'end-coverage-0' }).fillIn(
        dateTools.getRandomEndDate(RandomValue)
      ),
      Button('Save & close').click(),
    ]);
  },

  DropdownValuesSelect(names) {
    cy.do(MultiSelect().select(names));
  },

  bySelectionStatus(selectionStatus) {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },

  clickSearchTitles: (rowNumber = 0) => {
    cy.do(
      packageList
        .find(
          ListItem({ className: including('list-item-'), index: rowNumber })
        )
        .find(Button())
        .click()
    );
  },

  getSubjectValue: () => cy.then(() => KeyValue('Subjects').value()),
  subjectsAssertion() {
    this.getSubjectValue().then((val) => {
      // eslint-disable-next-line no-unused-expressions
      expect(val).to.be.exist;
    });
  },

  titlesSearch: () => {
    cy.expect(Button({ icon: 'search' }).exists());
    cy.do(Button({ icon: 'search' }).click());
    cy.expect(TextField({ id: 'eholdings-search' }).exists());
    cy.do([
      TextField({ id: 'eholdings-search' }).fillIn('engineering'),
      searchButton.click(),
    ]);
  },

  viewPackage: (rowNumber = 0) => {
    cy.expect(Spinner().absent);
    cy.do(
      resultSection
        .find(
          ListItem({ className: including('list-item-'), index: rowNumber })
        )
        .find(Button())
        .click()
    );
  },

  bySelectionStatusOpen(selectionStatus) {
    cy.do(selectionStatusSection.find(Button('Selection status')).click());
    cy.do(selectionStatusSection.find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },
};
