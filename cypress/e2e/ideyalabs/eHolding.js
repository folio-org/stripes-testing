import {
  Accordion,
  Button,
  FieldSet,
  KeyValue,
  Modal,
  MultiSelect,
  NavListItem,
  PaneContent,
  RadioButton,
  Section,
  Select,
  Spinner,
  TextArea,
  TextField,
} from '../../../interactors';
import eHoldingsNewCustomPackage from '../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import eholdingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import topMenu from '../../support/fragments/topMenu';
import dateTools from '../../support/utils/dateTools';
import getRandomPostfix, {
  randomFourDigitNumber,
  randomTwoDigitNumber,
} from '../../support/utils/stringTools';

const editButton = Button('Edit');
const actionsButton = Button('Actions');
const searchButton = Button('Search');
const description = TextArea({ name: 'description' });
const SaveAndClose = Button('Save & close');
const availableProxies = ['Inherited - None', 'FOLIO-Bugfest', 'EZProxy'];
const SearchButton = Section({ id: 'providerShowProviderList' }).find(
  Button({ ariaLabel: 'Toggle filters pane' })
);
const iconSearch = Button({ icon: 'search' });
const proxySelect = Select({ id: 'eholdings-proxy-id' });
const selectionStatusAccordion = Accordion({
  id: 'accordion-toggle-button-filter-packages-selected',
});
const selectionStatusSection = Section({ id: 'filter-packages-selected' });
const accordionClick = Button({
  id: 'accordion-toggle-button-providerShowProviderList',
});
const patronRadioButton = FieldSet('Show titles in package to patrons').find(
  RadioButton({ checked: false })
);
const tagsClick = Button({ id: 'accordion-toggle-button-providerShowTags' });
const providerClick = Button({
  id: 'accordion-toggle-button-providerShowProviderSettings',
});
const notesClick = Button({ id: 'accordion-toggle-button-providerShowNotes' });
const packagesClick = Button({
  id: 'accordion-toggle-button-providerShowProviderInformation',
});
const packageName = `package_${getRandomPostfix()}`;
const deletePackage = Button('Delete package');
const confirmModal = Modal('Delete custom package');

export default {
  packageAccordionClick() {
    cy.expect(accordionClick.exists());
    cy.do([accordionClick.click(), accordionClick.click()]);
    cy.expect(Spinner().absent());
  },
  verifyPackageButtonClick(name, open) {
    cy.expect(Button(name).exists());
    cy.do(Button(name).click());
    cy.expect([
      accordionClick.has({ ariaExpanded: open }),
      tagsClick.has({ ariaExpanded: open }),
      providerClick.has({ ariaExpanded: open }),
      notesClick.has({ ariaExpanded: open }),
      packagesClick.has({ ariaExpanded: open }),
    ]);
  },

  createAndVerify: () => {
    cy.do(Button('New').click());
    eHoldingsNewCustomPackage.fillInRequiredProperties(packageName);
    eHoldingsNewCustomPackage.saveAndClose();
    cy.expect(PaneContent({ id: `${packageName}-content` }).exists());
    return packageName;
  },

  deletePackage: () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider(packageName);
    eHoldingsPackages.openPackage();
    cy.do(actionsButton.click());
    cy.do(deletePackage.click());
    cy.do(confirmModal.find(Button('Yes, delete')).click());
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

  verifyAlternativesTitles() {
    this.getAlternateTitles().then((val) => {
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
        cy.do(proxySelect.choose(options[randomTwoDigitNumber()]));
      });
  },

  dropdownValuesSelect(names) {
    cy.expect(MultiSelect().exists());
    cy.do(MultiSelect().select(names));
  },

  bySelectionStatus(selectionStatus) {
    cy.expect(selectionStatusAccordion.exists());
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
  },

  bySelectionStatusSection(selectionStatus) {
    cy.expect(selectionStatusSection.exists());
    cy.do(selectionStatusSection.find(RadioButton(selectionStatus)).click());
  },

  bySelectionStatusOpen(selectionStatus) {
    cy.do(selectionStatusSection.find(Button('Selection status')).click());
    cy.do(selectionStatusSection.find(RadioButton(selectionStatus)).click());
    cy.do(Button('Search').click());
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
    cy.do(
      TextArea({ name: 'providerTokenValue' }).fillIn(
        `Test${randomFourDigitNumber()}`
      )
    );
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

  verifyAlternativeRadio() {
    this.getAlternateRadio().then((val) => {
      const radioArray = ['Yes', 'No'];
      const newRadioArray = radioArray.filter((x) => !x.includes(val));
      expect(val).to.not.equal(newRadioArray[0]);
    });
  },

  getDatesValue: () => cy.then(() => KeyValue('Custom coverage dates').value()),

  verifyAlternativeDates() {
    this.getDatesValue().then((val) => {
      // eslint-disable-next-line no-unused-expressions
      expect(val).to.be.exist;
    });
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based, so we add 1
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  },

  generateRandomDates() {
    const startDate = new Date(dateTools.editFromDateRange()); // Use your desired start date
    const endDate = new Date(dateTools.editEndDateRange()); // Use your desired end date
    let fromDate = this.getRandomDate(startDate, endDate);
    let toDate = this.getRandomDate(startDate, endDate);
    // Keep generating new dates until the "to" date is greater than the "from" date
    while (toDate <= fromDate) {
      fromDate = this.getRandomDate(startDate, endDate);
      toDate = this.getRandomDate(startDate, endDate);
    }
    const reqFromDate = this.formatDate(fromDate);
    const reqToDate = this.formatDate(endDate);
    // Start the fill in process in dates
    cy.do([
      TextField({ id: 'begin-coverage-0' }).fillIn(reqFromDate),
      TextField({ id: 'end-coverage-0' }).fillIn(reqToDate),
      SaveAndClose.click(),
    ]);
  },

  getRandomDate(startDate, endDate) {
    const start = startDate.getTime();
    const end = endDate.getTime();
    const randomTime = start + Math.random() * (end - start);
    return new Date(randomTime);
  },
};
