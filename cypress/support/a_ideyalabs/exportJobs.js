import {
  Button,
  KeyValue,
  Modal,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  Pane,
  PaneContent,
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
const allTitleRadioButton = RadioButton({ ariaLabel: 'Export all fields', name: 'titleFields' });
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
const packageDropDown = '//input[@aria-labelledby="selected-package-fields"]';
const titleDropdown = '//input[@aria-labelledby="selected-title-fields"]';
const JobId = "//div[@class='message---BOLVw']//b";
const fileName = '//div[text()="File name"]//following-sibling::div';

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
    cy.do(radioPackageFieldsToExport.click());
    cy.xpath(packageDropDown).click();
    cy.do([
      MultiSelectMenu().find(MultiSelectOption(options)).click(),
      exportSettingsModal.find(crossIcon).click(),
    ]);
  },

  packageFieldsToExportDropdown: (options) => {
    cy.do(radioPackageFieldsToExport.click());
    cy.xpath(packageDropDown).click();
    cy.do(MultiSelectMenu().find(MultiSelectOption(options)).click());
  },

  allTitleFieldsToExportRadioButton: () => {
    cy.do(allTitleRadioButton.click());
  },

  titleFieldsToExportRadio: () => {
    cy.do(radioTitleFieldsToExport.click());
  },

  titleFieldsToExportDropDown: () => {
    cy.xpath(titleDropdown).click();
  },

  titleFieldsSelectFromExportDropDown: (options) => {
    cy.do(radioTitleFieldsToExport.click());
    cy.xpath(titleDropdown).click();
    cy.do([
      MultiSelectMenu().find(MultiSelectOption(options)).click(),
      exportSettingsModal.find(crossIcon).click(),
    ]);
  },

  clickExportButton: () => {
    cy.do(exportSettingsModal.find(exportButton).click());
  },

  clickCancelButton: () => {
    cy.do(exportSettingsModal.find(cancelButton).click());
  },

  verifyJobIDRecord() {
    cy.xpath(JobId).then(($ele) => {
      const txt = $ele.text();
      const txt1 = txt.slice(26, 32);
      cy.visit(topMenu.exportManagerPath);
      exportManagerSearchPane.searchBySuccessful();
      exportManagerSearchPane.downloadLastCreatedJob(txt1);
    });
  },
  verifyFileName: () => {
    cy.expect(cy.xpath(fileName));
  },

  verifyJobIdInThirdPaneHasNoLink(JobId) {
    this.verifyThirdPaneExportJobExist();
    cy.get(`span:contains(${JobId})`).its('length').then((length) => {
      if (length > 0) {
        cy.get(`span:contains(${JobId})`).click();
        cy.log('job id is "InProgress" or "Failed"');
      } else {
        cy.get(`span:contains(${JobId})`).click();
        exportManagerSearchPane.downloadLastCreatedJob(txt1);
      }
    });
  },
  verifyThirdPaneExportJobExist() {
    cy.wait(10000);
    cy.expect(PaneHeader('Export jobs').exists());
  },
};
