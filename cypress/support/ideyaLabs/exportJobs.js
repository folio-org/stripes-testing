import {
  Button,
  Callout,
  KeyValue,
  Modal,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  PaneHeader,
  RadioButton,
  Section,
  TextField,
} from '../../../interactors';
import exportManagerSearchPane from '../fragments/exportManager/exportManagerSearchPane';
import topMenu from '../fragments/topMenu';

const actionsBtn = Button('Actions');
const radioPackageFieldsToExport = RadioButton({
  id: 'selected-package-fields',
});
const radioTitleFieldsToExport = RadioButton({ id: 'selected-title-fields' });
const allPackageRadioButton = RadioButton({
  ariaLabel: 'Export all fields',
  name: 'packageFields',
});
const allTitleRadioButton = RadioButton({
  ariaLabel: 'Export all fields',
  name: 'titleFields',
});
const exportButton = Button('Export');
const crossIcon = Button({ icon: 'times' });
const exportSettingsModal = Modal({ id: 'eholdings-export-modal' });
const cancelButton = Button('Cancel');
const titlesSection = Section({ id: 'packageShowTitles' });
const searchIcon = Button({ icon: 'search' });
const filterTitlesModal = Modal({ id: 'eholdings-details-view-search-modal' });
const titlesSearchField = TextField({ id: 'eholdings-search' });
const selectionStatusButton = Button('Selection status');
const notSelectedRadioButton = RadioButton('Not selected');
const searchButton = Button('Search');

export default {
  exportsPackageCSVClick: () => {
    cy.do(actionsBtn.click());
    cy.do(Button('Export package (CSV)').click());
  },
  filterTitles: (title) => {
    cy.do([
      titlesSection.find(searchIcon).click(),
      filterTitlesModal.find(titlesSearchField).fillIn(title),
      filterTitlesModal.find(selectionStatusButton).click(),
      filterTitlesModal.find(notSelectedRadioButton).click(),
      filterTitlesModal.find(searchButton).click(),
    ]);
  },

  packageFieldsToExportRadio: () => {
    cy.do(radioPackageFieldsToExport.click());
  },
  allPackageFieldsToExportRadioButton: () => {
    cy.do(allPackageRadioButton.click());
  },

  packageFieldsSelectFromExportDropdown: (options) => {
    cy.do([
      radioPackageFieldsToExport.click(),
      MultiSelect({ ariaLabelledby: 'selected-package-fields' }).toggle(),
      MultiSelectMenu().find(MultiSelectOption(options)).click(),
      exportSettingsModal.find(crossIcon).click(),
    ]);
  },

  packageFieldsToExportDropdown: (options) => {
    cy.do([
      radioPackageFieldsToExport.click(),
      MultiSelect({ ariaLabelledby: 'selected-package-fields' }).toggle(),
      MultiSelectMenu().find(MultiSelectOption(options)).click(),
    ]);
  },

  allTitleFieldsToExportRadioButton: () => {
    cy.do(allTitleRadioButton.click());
  },

  titleFieldsToExportRadio: () => {
    cy.do(radioTitleFieldsToExport.click());
  },

  titleFieldsToExportDropDown: (options) => {
    cy.do([
      MultiSelect({ ariaLabelledby: 'selected-title-fields' }).toggle(),
      MultiSelectMenu().find(MultiSelectOption(options)).click(),
    ]);
  },

  clickExportButton: () => {
    cy.do(exportSettingsModal.find(exportButton).click());
  },

  clickCancelButton: () => {
    cy.do(exportSettingsModal.find(cancelButton).click());
  },

  verifyJobIDRecord() {
    cy.expect(Callout({ type: 'success' }).exists());
    cy.wrap(Callout({ type: 'success' }).text()).as('message');
    cy.get('@message').then((val) => {
      const txt1 = val.slice(31, 37);
      cy.visit(topMenu.exportManagerPath);
      exportManagerSearchPane.searchBySuccessful();
      exportManagerSearchPane.downloadLastCreatedJob(txt1);
    });
  },

  getFileName: () => cy.then(() => KeyValue('File name').value()),
  verifyFileName(fileName) {
    this.getFileName().then((val) => {
      expect(val).to.include(fileName);
    });
  },

  verifyThirdPaneExportJobExist() {
    cy.expect(PaneHeader('Export jobs').exists());
  },
};
