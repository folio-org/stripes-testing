import { HTML } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  KeyValue,
  Link,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectOption,
  Pane,
  PaneHeader,
  SearchField,
  Section,
  Select,
  Selection,
  SelectionOption,
  Spinner,
  TextArea,
  TextField,
  including,
  MultiSelectMenu,
  or,
  PaneContent,
  Card,
  RepeatableField,
} from '../../../../interactors';
import { AppList } from '../../../../interactors/applist';
import InteractorsTools from '../../utils/interactorsTools';
import getRandomPostfix from '../../utils/stringTools';
import SearchHelper from '../finance/financeHelper';
import OrganizationDetails from './organizationDetails';
import DateTools from '../../utils/dateTools';

const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const saveAndKeepEditingButton = Button('Save & keep editing');
const summaryAccordionId = 'summarySection';
const rootSection = PaneContent({ id: 'organizations-results-pane-content' });
const organizationList = rootSection.find(MultiColumnList({ id: 'organizations-list' }));
const contactPeopleDetails = MultiColumnList({ id: 'contact-list' });
const organizationsList = MultiColumnList({ id: 'organizations-list' });
const blueColor = 'rgba(0, 0, 0, 0)';
const tagButton = Button({ icon: 'tag' });
const summarySection = Accordion({ id: summaryAccordionId });
const searchInput = SearchField({ id: 'input-record-search' });
const vendorEDICodeEdited = `${getRandomPostfix()}`;
const libraryEDICodeEdited = `${getRandomPostfix()}`;
const serverAddress = 'ftp://ftp.ci.folio.org';
const FTPport = '22';
const ediSection = Section({ id: 'edi' });
const ftpSection = Section({ id: 'ftp' });
const schedulingSection = Section({ id: 'scheduling' });
const actionsButton = Button('Actions');
const numberOfSearchResultsHeader = '//*[@id="paneHeaderorganizations-results-pane-subtitle"]/span';
const categoryDropdown = Button('Category');
const zeroResultsFoundText = '0 records found';
const organizationStatus = Select('Organization status*');
const organizationNameField = TextField('Name*');
const nameTextField = TextField('[object Object] 0');
const organizationCodeField = TextField('Code*');
const resetButton = Button('Reset all');
const openContactSectionButton = Button({
  id: 'accordion-toggle-button-contactPeopleSection',
});
const newButton = Button('+ New');
const addContacsModal = Modal('Add contacts');
const lastNameField = TextField({ name: 'lastName' });
const firstNameField = TextField({ name: 'firstName' });
const saveButtonInCotact = Button({
  id: 'clickable-save-contact-person-footer',
});
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const duplicateButton = Button('Duplicate');
const contactPeopleSection = Section({ id: 'contactPeopleSection' });
const addContactButton = Button('Add contact');
const openInterfaceSectionButton = Button({
  id: 'accordion-toggle-button-interfacesSection',
});
const interfaceSection = Section({ id: 'interfacesSection' });
const addInterfaceButton = Button('Add interface');
const addInterfacesModal = Modal('Add interfaces');
const saveButton = Button('Save');
const confirmButton = Button('Confirm');
const searchButtonInModal = Button({ type: 'submit' });
const timesButton = Button({ icon: 'times' });
const categoryButton = Button('Categories');
const openintegrationDetailsSectionButton = Button({
  id: 'accordion-toggle-button-integrationDetailsSection',
});
const listIntegrationConfigs = MultiColumnList({
  id: 'list-integration-configs',
});
const donorCheckbox = Checkbox('Donor');
const toggleButtonIsDonor = Button({ id: 'accordion-toggle-button-isDonor' });
const donorSection = Section({ id: 'isDonor' });
const bankingInformationButton = Button('Banking information');
const bankingInformationAddButton = Button({ id: 'bankingInformation-add-button' });
const privilegedDonorInformationSection = Section({ id: 'privilegedDonorInformation' });
const toggleOrganizationStatus = Button({ id: 'accordion-toggle-button-status' });
const toggleOrganizationTypes = Button({
  id: 'accordion-toggle-button-org-filter-organizationTypes',
});
const toggleOrganizationTags = Button({ id: 'accordion-toggle-button-tags' });
const toggleButtonIsVendor = Button({ id: 'accordion-toggle-button-isVendor' });
const toggleButtonCountry = Button({ id: 'accordion-toggle-button-plugin-country-filter' });
const toggleButtonLanguage = Button({ id: 'accordion-toggle-button-plugin-language-filter' });
const toggleButtonPaymentMethod = Button({ id: 'accordion-toggle-button-paymentMethod' });
const toggleButtonAcquisitionMethod = Button({
  id: 'accordion-toggle-button-org-filter-acqUnitIds',
});
const toggleButtonCreatedBy = Button({ id: 'accordion-toggle-button-metadata.createdByUserId' });
const toggleButtonDateCreated = Button({ id: 'accordion-toggle-button-metadata.createdDate' });
const toggleButtonUpdatedBy = Button({ id: 'accordion-toggle-button-metadata.updatedByUserId' });
const toggleButtonDateUpdated = Button({ id: 'accordion-toggle-button-metadata.updatedDate' });
const updatedDateAccordion = Section({ id: 'metadata.updatedDate' });
const startDateField = TextField({ name: 'startDate' });
const endDateField = TextField({ name: 'endDate' });
const applyButton = Button('Apply');
const vendorInformationAccordion = Button({
  id: 'accordion-toggle-button-vendorInformationSection',
});
const paymentMethodSection = Select('Payment method');
const vendorTermsAccordion = Button({ id: 'accordion-toggle-button-agreementsSection' });
const accountAccordion = Button({ id: 'accordion-toggle-button-accountsSection' });
const accountStatus = Select('Account status*');

const tagsPane = Pane('Tags');

const nextButton = Button('Next', { disabled: or(true, false) });
const previousButton = Button('Previous', { disabled: or(true, false) });
const contactStatusButton = Button({ id: 'accordion-toggle-button-inactive' });

const noResultsMessageLabel = '//span[contains(@class,"noResultsMessageLabel")]';

const contactInformationSection = Button({
  id: 'accordion-toggle-button-contactInformationSection',
});

export default {
  waitLoading: () => {
    cy.expect(Pane({ id: 'organizations-results-pane' }).exists());
  },

  verifySearchAndFilterPane() {
    cy.expect([
      toggleOrganizationStatus.exists(),
      toggleOrganizationTypes.exists(),
      toggleOrganizationTags.exists(),
      toggleButtonIsDonor.exists(),
      toggleButtonIsVendor.exists(),
      toggleButtonCountry.exists(),
      toggleButtonLanguage.exists(),
      toggleButtonPaymentMethod.exists(),
      toggleButtonAcquisitionMethod.exists(),
      toggleButtonCreatedBy.exists(),
      toggleButtonDateCreated.exists(),
      toggleButtonUpdatedBy.exists(),
      toggleButtonDateUpdated.exists(),
    ]);
  },

  verifyPagination(numberOfRows) {
    cy.expect([
      previousButton.has({ disabled: or(true, false) }),
      nextButton.has({ disabled: or(true, false) }),
    ]);
    cy.then(() => organizationList.rowCount()).then((rowsCount) => {
      expect(rowsCount).to.be.at.most(numberOfRows);
    });
  },

  verifyPaginationInContactList() {
    cy.expect([
      previousButton.has({ disabled: or(true, false) }),
      nextButton.has({ disabled: or(true, false) }),
    ]);
  },

  clickNextPaginationButton() {
    cy.do(nextButton.click());
    cy.wait(2000);
  },

  clickPreviousPaginationButton: () => {
    cy.do(previousButton.click());
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  clickExpandAllButton: () => {
    cy.do(Button('Expand all').click());
    cy.wait(3000);
  },

  verifyNoResultMessage: (noResultMessage) => cy.expect(rootSection.find(HTML(including(noResultMessage))).exists()),

  getLastUpdateTime() {
    return cy
      .contains('Record last updated:')
      .invoke('text')
      .then((text) => text.replace('Record last updated:', '').trim());
  },

  openVersionHistory() {
    cy.do(
      Section({ id: 'pane-organization-details' })
        .find(Button({ icon: 'clock' }))
        .click(),
    );
    cy.wait(2000);
  },

  selectVersionHistoryCard(date) {
    cy.do([
      Section({ id: 'versions-history-pane-organization' })
        .find(Card({ headerStart: date }))
        .find(Button({ icon: 'clock' }))
        .click(),
    ]);
  },

  checkAllExpandedAccordion: () => {
    cy.get('#pane-organization-details-content')
      .find('[id^="accordion-toggle-button-"]')
      .should('have.length.at.least', 1)
      .each(($btn) => {
        expect($btn).to.have.attr('aria-expanded', 'true');
      });
  },

  pressCtrlPAndVerifyPrintView: () => {
    cy.window().then((win) => {
      cy.stub(win, 'print').as('print');
    });
    cy.window().then((win) => {
      const e = new win.KeyboardEvent('keydown', {
        key: 'p',
        code: 'KeyP',
        ctrlKey: true,
        bubbles: true,
      });
      win.document.dispatchEvent(e);
    });
    cy.wait(50);
    cy.get('@print').then((stub) => {
      if (!stub.called) {
        cy.window().then((win) => win.print());
      }
    });
    cy.get('@print').should('have.been.called');
  },

  createOrganizationViaUi: (organization) => {
    cy.expect(buttonNew.exists());
    cy.do(buttonNew.click());
    cy.wait(4000);
    cy.do([
      organizationStatus.choose(organization.status),
      organizationNameField.fillIn(organization.name),
      organizationCodeField.fillIn(organization.code),
      saveAndClose.click(),
    ]);
  },

  fillInInfoNewOrganization: (organization) => {
    cy.do([
      organizationStatus.choose(organization.status),
      organizationNameField.fillIn(organization.name),
    ]);
    cy.wait(3000);
    cy.do([organizationCodeField.fillIn(organization.code)]);
  },

  newOrganization: () => {
    cy.expect(buttonNew.exists());
    cy.do(buttonNew.click());
  },

  fillNameField: (name) => {
    cy.do([organizationNameField.fillIn(name)]);
  },

  checkRequiredFields: (field) => {
    if (field === 'Name') {
      cy.expect(TextField(including('Name')).has({ error: 'Required!' }));
    } else if (field === 'Code') {
      cy.expect(TextField(including('Code')).has({ error: 'Required!' }));
    } else if (field === 'Status') {
      cy.expect(Select(including('Organization status')).has({ error: 'Required!' }));
    }
  },

  varifyAbsentOrganizationApp: () => {
    cy.expect(AppList('Organizations').absent());
  },
  varifyAbsentPrivilegedDonorInformationSection: () => {
    cy.wait(4000);
    cy.expect(privilegedDonorInformationSection.absent());
  },
  buttonNewIsAbsent: () => {
    cy.expect(Pane({ id: 'organizations-results-pane' }).find(buttonNew).absent());
  },

  createDonorOrganization: (organization) => {
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      organizationStatus.choose(organization.status),
      organizationNameField.fillIn(organization.name),
      organizationCodeField.fillIn(organization.code),
      donorCheckbox.click(),
    ]);
    cy.expect(donorCheckbox.is({ disabled: false }));
    cy.do(saveAndClose.click());
  },

  addDonorToOrganization: () => {
    cy.wait(4000);
    cy.do(donorCheckbox.click());
    cy.expect(donorCheckbox.is({ disabled: false }));
    cy.do(saveAndClose.click());
  },

  removeDonorFromOrganization: () => {
    cy.wait(4000);
    cy.expect(donorCheckbox.is({ disabled: false }));
    cy.do(donorCheckbox.click());
    cy.do(saveAndClose.click());
  },

  selectDonorCheckbox: () => {
    cy.wait(4000);
    cy.do(donorCheckbox.click());
  },

  createOrganizationWithAU: (organization, AcquisitionUnit) => {
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      organizationStatus.choose(organization.status),
      organizationNameField.fillIn(organization.name),
      organizationCodeField.fillIn(organization.code),
    ]);
    // Need to wait while Acquisition Unit data will be loaded
    cy.wait(4000);
    cy.do([
      MultiSelect({ id: 'org-acq-units' })
        .find(Button({ ariaLabel: 'open menu' }))
        .click(),
      MultiSelectOption(AcquisitionUnit).click(),
      saveAndClose.click(),
    ]);
  },

  addAdressToOrganization: (address, numberOfAdress) => {
    const steps = [];
    if (address.addressLine1) {
      cy.do([
        TextField({ name: `addresses[${numberOfAdress}].addressLine1` }).fillIn(
          address.addressLine1,
        ),
      ]);
    }
    if (address.addressLine2) {
      cy.do([
        TextField({ name: `addresses[${numberOfAdress}].addressLine2` }).fillIn(
          address.addressLine2,
        ),
      ]);
    }
    if (address.city) {
      cy.do([TextField({ name: `addresses[${numberOfAdress}].city` }).fillIn(address.city)]);
    }
    if (address.stateRegion) {
      cy.do([
        TextField({ name: `addresses[${numberOfAdress}].stateRegion` }).fillIn(address.stateRegion),
      ]);
    }
    if (address.zipCode) {
      cy.do([TextField({ name: `addresses[${numberOfAdress}].zipCode` }).fillIn(address.zipCode)]);
    }
    if (address.country) {
      cy.do([Selection({ name: `addresses[${numberOfAdress}].country` }).choose(address.country)]);
    }
    if (address.language) {
      cy.do([
        Selection({ name: `addresses[${numberOfAdress}].language` }).choose(address.language),
      ]);
    }
    if (address.category) {
      const values = Array.isArray(address.category) ? address.category : [address.category];
      const ms = MultiSelect({ label: 'Categories' }).nth(numberOfAdress);
      steps.push(ms.open());
      values.forEach((v) => {
        steps.push(MultiSelectMenu().find(MultiSelectOption(v)).clickSegment());
      });
      steps.push(ms.close());
    }
    cy.do(steps);
  },

  addPhoneNumberToOrganization: (phoneNumber, numberOfPhoneNumber) => {
    if (phoneNumber.phoneNum) {
      cy.do([
        TextField({ name: `phoneNumbers[${numberOfPhoneNumber}].phoneNumber` }).fillIn(
          phoneNumber.phoneNum,
        ),
      ]);
    }
    if (phoneNumber.type) {
      cy.do([
        Selection({ name: `phoneNumbers[${numberOfPhoneNumber}].type` }).choose(phoneNumber.type),
      ]);
    }
    if (phoneNumber.language) {
      cy.do([
        Selection({ name: `phoneNumbers[${numberOfPhoneNumber}].language` }).choose(
          phoneNumber.language,
        ),
      ]);
    }
    if (phoneNumber.categories) {
      const values = Array.isArray(phoneNumber.categories)
        ? phoneNumber.categories
        : [phoneNumber.categories];
      const ms = MultiSelect({ label: 'Categories' }).nth(numberOfPhoneNumber);
      const steps = [RepeatableField({ id: 'phone-numbers' }).find(ms).open()];

      values.forEach((v) => {
        steps.push(MultiSelectMenu().find(MultiSelectOption(v)).clickSegment());
      });
      steps.push(ms.close());
      cy.do(steps);
    }
  },

  openContactInformationSection: () => {
    cy.do([contactInformationSection.click()]);
  },

  clickAddAdressButton: () => {
    cy.do([Button({ id: 'addresses-add-button' }).click()]);
  },

  clickAddPhoneNumberButton: () => {
    cy.do(Button({ id: 'phone-numbers-add-button' }).click());
  },

  organizationTagDetails: () => {
    cy.do([tagButton.click()]);
  },

  verifyTagsCount: (expected = 1) => {
    cy.expect(Button({ id: 'clickable-show-tags' }).has({ text: including(String(expected)) }));
  },

  addTagToOrganization: (tag) => {
    const tagsMs = MultiSelect({ id: 'input-tag' });
    cy.do([tagsMs.open(), tagsMs.filter(tag)]);
    cy.do(tagsMs.open());
    cy.expect(MultiSelectMenu({ visible: true }).exists());
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption(including('Add tag for:')))
        .click(),
    );
    cy.do(tagsMs.close());
    InteractorsTools.checkCalloutMessage('New tag created');
  },

  selectAnyExistingTag: () => {
    const tagsMs = MultiSelect({ id: 'input-tag' });
    cy.do(tagsMs.open());
    cy.expect(MultiSelectMenu({ visible: true }).exists());
    cy.do(
      MultiSelectMenu()
        .find(MultiSelectOption({ index: 0 }))
        .click(),
    );
    cy.do(tagsMs.close());
  },

  closeTagsPane() {
    cy.do(
      tagsPane
        .find(PaneHeader())
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.wait(1000);
    cy.expect(tagsPane.absent());
  },

  selectTagFilter: (tag) => {
    cy.wait(3000);
    cy.do([
      Button({ id: 'accordion-toggle-button-tags' }).click(),
      MultiSelect({ id: 'acq-tags-filter' }).open(),
      MultiSelectMenu().find(MultiSelectOption(tag)).clickSegment(),
    ]);
  },

  selectActiveStatus: () => {
    cy.do(Checkbox('Active').click());
  },

  selectPendingStatus: () => {
    cy.wait(3000);
    cy.do(Checkbox('Pending').click());
  },

  selectInactiveStatus: () => {
    cy.wait(3000);
    cy.do(Checkbox('Inactive').click());
  },

  selectIsDonorFilter: (isDonor) => {
    if (isDonor === 'Yes') {
      cy.wait(3000);
      cy.do([
        toggleButtonIsDonor.click(),
        donorSection.find(Checkbox('Yes')).click(),
        toggleButtonIsDonor.click(),
      ]);
    } else if (isDonor === 'No') {
      cy.wait(3000);
      cy.do([
        toggleButtonIsDonor.click(),
        donorSection.find(Checkbox('No')).click(),
        toggleButtonIsDonor.click(),
      ]);
    }
  },

  selectCreatedByFiler: (createdBy) => {
    cy.do([
      toggleButtonCreatedBy.click(),
      Button('Find User').click(),
      TextField({ name: 'query' }).fillIn(createdBy),
      searchButtonInModal.click(),
      MultiColumnListRow({ index: 0 }).click(),
    ]);
  },

  selectUpdatedByFiler: (createdBy) => {
    cy.do([
      toggleButtonUpdatedBy.click(),
      Button('Find User').click(),
      TextField({ name: 'query' }).fillIn(createdBy),
      searchButtonInModal.click(),
      MultiColumnListRow({ index: 0 }).click(),
    ]);
  },

  checkOrganizationFilter: () => {
    cy.expect(organizationsList.exists());
  },

  addNewCategory: (value) => {
    cy.do(categoryButton.click());
    cy.expect(newButton.exists());
    cy.do(newButton.click());
    cy.do(nameTextField.fillIn(value));
    cy.do(saveButton.click());
    cy.contains(value).should('exist');
  },

  chooseOrganizationFromList: (organization) => {
    cy.do(organizationsList.find(MultiColumnListCell({ content: organization.name })).click());
  },

  addIntegration: () => {
    cy.wait(4000);
    cy.do([
      openintegrationDetailsSectionButton.click(),
      Button({ id: 'clickable-neworganization-integration' }).click(),
    ]);
  },

  selectIntegration: (integrationName) => {
    cy.do([
      openintegrationDetailsSectionButton.click(),
      listIntegrationConfigs.find(MultiColumnListCell({ content: integrationName })).click(),
    ]);
  },

  clickSchedulingEDICheckbox: () => {
    cy.do([
      Checkbox({
        name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.enableScheduledExport',
      }).click(),
    ]);
  },

  fillScheduleInfo: (info) => {
    cy.get('[aria-labelledby="accordion-toggle-button-scheduling"]').within(() => {
      cy.get('select[name$="schedulePeriod"]').select(String(info.period));

      const setNativeValue = (input, value) => {
        const proto = Object.getPrototypeOf(input);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(input, String(value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const blurInput = (input) => {
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        input.dispatchEvent(new Event('focusout', { bubbles: true }));
      };

      if (info.frequency !== undefined && info.frequency !== null) {
        cy.get('input[data-testid="schedule-frequency"]').then(($inp) => {
          const el = $inp[0];
          setNativeValue(el, info.frequency);
          blurInput(el);
        });
      }

      if (info.day !== undefined && info.day !== null) {
        cy.get('input[name$="scheduleDay"]').then(($inp) => {
          if ($inp.length) {
            const el = $inp[0];
            setNativeValue(el, info.day);
            blurInput(el);
          }
        });
      }

      if (info.date) {
        cy.get('input[name$="schedulingDate"]').then(($inp) => {
          if ($inp.length) {
            const el = $inp[0];
            setNativeValue(el, info.date);
            blurInput(el);
          }
        });
      }

      cy.get('input[name$="scheduleTime"]')
        .should('be.visible')
        .then(($inp) => {
          const el = $inp[0];
          setNativeValue(el, '');
          setNativeValue(el, String(info.time));
          blurInput(el);
        });
    });
  },

  checkDayFieldError(expectedError = 'Value must be less than or equal to 31') {
    cy.get('[class^=feedbackError]').should('contain.text', expectedError);
  },

  fillIntegrationInformation: (
    integrationName,
    integartionDescription,
    vendorEDICode,
    libraryEDICode,
    accountNumber,
    acquisitionMethod,
  ) => {
    cy.wait(4000);
    cy.do([
      Select('Integration type*').choose('Ordering'),
      Section({ id: 'integrationInfo' })
        .find(TextField('Integration name*'))
        .fillIn(integrationName),
      TextArea('Description').fillIn(integartionDescription),
      ediSection.find(TextField('Vendor EDI code*')).fillIn(vendorEDICode),
      ediSection.find(TextField('Library EDI code*')).fillIn(libraryEDICode),
      ediSection.find(Button({ icon: 'info' })).click(),
      Checkbox({
        name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.supportOrder',
      }).click(),
      Checkbox({
        name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.supportInvoice',
      }).click(),
    ]);
    cy.get(
      'select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.accountNoList"]',
    ).select(accountNumber);
    cy.get(
      'select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.defaultAcquisitionMethods"]',
    ).select(acquisitionMethod);
    cy.do([
      ftpSection.find(Select('EDI FTP')).choose('FTP'),
      ftpSection.find(TextField(including('Server address'))).fillIn(serverAddress),
      ftpSection.find(TextField(including('FTP port'))).fillIn(FTPport),
      ftpSection.find(TextField('Username')).fillIn('folio'),
      ftpSection.find(TextField('Password')).fillIn('Ffx29%pu'),
      ftpSection.find(TextField('Order directory')).fillIn('/files'),
    ]);
    cy.do([
      Checkbox({
        name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.enableScheduledExport',
      }).click(),
      schedulingSection.find(Select('Schedule period*')).choose('Daily'),
      schedulingSection.find(TextField('Schedule frequency*')).fillIn('1'),
      schedulingSection.find(TextField('Time*')).fillIn(DateTools.getUTCDateForScheduling()),
    ]);
    cy.do(saveAndClose.click());
    cy.wait(4000);
  },

  fillIntegrationInformationWithoutScheduling: (
    integrationName,
    integartionDescription,
    vendorEDICode,
    libraryEDICode,
    accountNumber,
    acquisitionMethod,
  ) => {
    cy.do([
      Section({ id: 'integrationInfo' })
        .find(TextField('Integration name*'))
        .fillIn(integrationName),
      TextArea('Description').fillIn(integartionDescription),
      ediSection.find(TextField('Vendor EDI code')).fillIn(vendorEDICode),
      ediSection.find(TextField('Library EDI code')).fillIn(libraryEDICode),
      ediSection.find(Button({ icon: 'info' })).click(),
      Checkbox({
        name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.supportInvoice',
      }).click(),
    ]);
    cy.get(
      'select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.accountNoList"]',
    ).select(accountNumber);
    cy.get(
      'select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.defaultAcquisitionMethods"]',
    ).select(acquisitionMethod);
    cy.do([
      ftpSection.find(Select('EDI FTP')).choose('FTP'),
      ftpSection.find(TextField('Server address')).fillIn(serverAddress),
      ftpSection.find(TextField('FTP port')).fillIn(FTPport),
    ]);
    cy.do(saveAndClose.click());
  },

  fillIntegrationInformationWithoutSchedulingWithDifferentInformation: (information) => {
    if (information.integrationName) {
      cy.do([
        Section({ id: 'integrationInfo' })
          .find(TextField('Integration name*'))
          .fillIn(information.integrationName),
      ]);
    }
    if (information.integrationDescription) {
      cy.do([TextArea('Description').fillIn(information.integrationDescription)]);
    }
    if (information.integrationType) {
      cy.do(
        Section({ id: 'integrationInfo' })
          .find(Select(including('Integration type')))
          .choose(information.integrationType),
      );
    }
    if (information.transmissionMethod) {
      cy.do([Select('Transmission method*').choose(information.transmissionMethod)]);
    }
    if (information.fileFormat) {
      cy.do([Select('File format*').choose(information.fileFormat)]);
    }
    if (information.vendorEDICode) {
      cy.do([ediSection.find(TextField('Vendor EDI code*')).fillIn(information.vendorEDICode)]);
    }
    if (information.libraryEDICode) {
      cy.do([ediSection.find(TextField('Library EDI code*')).fillIn(information.libraryEDICode)]);
    }
    if (information.ordersMessageForVendor) {
      cy.do([
        ediSection.find(Button({ icon: 'info' })).click(),
        Checkbox({
          name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.supportOrder',
        }).click(),
      ]);
    }
    if (information.invoicesMessageForVendor) {
      cy.do([
        ediSection.find(Button({ icon: 'info' })).click(),
        Checkbox({
          name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.supportInvoice',
        }).click(),
      ]);
    }
    if (information.accountNumber) {
      cy.get(
        'select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.accountNoList"]',
      ).select(information.accountNumber);
    }
    if (information.acquisitionMethod) {
      cy.get(
        'select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.defaultAcquisitionMethods"]',
      ).select(information.acquisitionMethod);
    }
    if (information.ediFTP) {
      cy.do(ftpSection.find(Select('EDI FTP')).choose(information.ediFTP));
    }
    if (information.connectionMode) {
      cy.do(ftpSection.find(Select('FTP connection mode')).choose(information.connectionMode));
    }
    if (information.serverAddress) {
      cy.do([
        ftpSection.find(TextField('Server address*')).fillIn(serverAddress),
        ftpSection.find(TextField('FTP port*')).fillIn(FTPport),
        ftpSection.find(TextField('Username')).fillIn('folio'),
        ftpSection.find(TextField('Password')).fillIn('Ffx29%pu'),
        ftpSection.find(TextField('Order directory')).fillIn('/files'),
      ]);
    }
  },

  editIntegrationInformation: () => {
    cy.wait(4000);
    cy.do([
      actionsButton.click(),
      editButton.click(),
      ediSection.find(TextField('Vendor EDI code')).fillIn(vendorEDICodeEdited),
      ediSection.find(TextField('Library EDI code')).fillIn(libraryEDICodeEdited),
      saveAndClose.click(),
    ]);
  },

  editIntegration: () => {
    cy.do([actionsButton.click(), editButton.click()]);
  },

  duplicateIntegration: () => {
    cy.do([actionsButton.click(), duplicateButton.click()]);
  },

  deleteIntegration: () => {
    cy.do([actionsButton.click(), deleteButton.click()]);
  },

  confirmDuplicateIntegration: () => {
    cy.do(
      Modal({ id: 'duplicate-integration-modal' })
        .find(Button({ id: 'clickable-duplicate-integration-modal-confirm' }))
        .click(),
    );
  },

  confirmDeleteIntegration: () => {
    cy.do(
      Modal({ id: 'integration-remove-confirmation' })
        .find(Button({ id: 'clickable-integration-remove-confirmation-confirm' }))
        .click(),
    );
  },

  changeDayOnTommorowInIntegation: (tomorrowDate) => {
    cy.do([
      schedulingSection
        .find(
          TextField({
            name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.scheduleParameters.schedulingDate',
          }),
        )
        .fillIn(`${tomorrowDate}`),
      saveAndClose.click(),
    ]);
    cy.wait(4000);
  },

  checkChangeDayOnTommorowInIntegation: (tomorrowDate) => {
    cy.expect(schedulingSection.find(KeyValue({ value: tomorrowDate })));
    cy.wait(4000);
  },

  checkSelectedDayInIntegration(day, isChecked) {
    cy.expect(Checkbox(day).has({ disabled: true, checked: isChecked }));
  },

  checkTransmissionAndFileFormatState: (isDisabled = true) => {
    cy.expect([
      Select('Transmission method*').has({ disabled: isDisabled }),
      Select('File format*').has({ disabled: isDisabled }),
    ]);
  },

  checkFieldsAreRequired: (fieldLabels) => {
    fieldLabels.forEach((label) => {
      cy.contains('label', label)
        .invoke('attr', 'for')
        .then((inputId) => {
          cy.get(`#${inputId}`).then(($el) => {
            const isSelect = $el[0].tagName.toLowerCase() === 'select';
            cy.wrap($el).should('have.attr', 'aria-invalid', 'true');
            if (isSelect) {
              cy.wrap($el)
                .closest('[class^=selectWrap]')
                .siblings('div[role="alert"]')
                .find('[class^=feedbackError]')
                .should('contain.text', 'Required!');
            } else {
              cy.wrap($el)
                .closest('[class^=formControl]')
                .siblings('div[role="alert"]')
                .find('[class^=feedbackError]')
                .should('contain.text', 'Required!');
            }
          });
        });
    });
  },

  checkIsaDonor: (organization) => {
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(summarySection.find(donorCheckbox).is({ visible: true, disabled: false }));
  },

  checkIsNotaDonor: (organization) => {
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(summarySection.find(donorCheckbox).is({ visible: true, disabled: true }));
  },

  checkIsaVendor: (organization) => {
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(
      summarySection.find(Checkbox('Vendor')).has({ checked: true, disabled: true, visible: true }),
    );
  },

  expectColorFromList: () => {
    cy.get('#organizations-list').should('have.css', 'background-color', blueColor);
  },

  checkOrganizationInfo: (organization) => {
    cy.wait(3000);
    OrganizationDetails.waitLoading();
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(summarySection.find(KeyValue({ value: organization.code })).exists());
  },

  searchByParameters: (parameter, value) => {
    cy.wait(4000);
    cy.do([
      searchInput.selectIndex(parameter),
      searchInput.fillIn(value),
      Button('Search').click(),
    ]);
  },

  resetFilters: () => {
    cy.wait(3000);
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true })); // Actual : true
    cy.wait(3000);
  },

  resetFiltersIfActive: () => {
    cy.get('[data-testid="reset-button"]')
      .invoke('is', ':enabled')
      .then((state) => {
        if (state) {
          cy.do(resetButton.click());
          cy.wait(500);
          cy.expect(resetButton.is({ disabled: true }));
        }
      });
  },

  checkSearchResults: (organization) => {
    cy.wait(4000);
    cy.expect(organizationsList.find(Link(organization.name)).exists());
  },

  selectYesInIsVendor: () => {
    cy.do([toggleButtonIsVendor.click(), Checkbox('Yes').click()]);
  },

  selectNoInIsVendor: () => {
    cy.wait(3000);
    cy.do([toggleButtonIsVendor.click(), Checkbox('No').click()]);
  },

  selectVendor: () => {
    cy.do([Checkbox('Vendor').click()]);
  },

  deselectVendor: () => {
    cy.do([Checkbox('Vendor').click(), confirmButton.click(), saveAndClose.click()]);
  },

  addVendorInformation(vendorInformation) {
    cy.do([
      vendorInformationAccordion.click(),
      paymentMethodSection.choose(vendorInformation.paymentMethod),
    ]);
    cy.wait(4000);
    cy.do([
      vendorTermsAccordion.click(),
      Button('Add').click(),
      TextField({ name: 'agreements[0].name' }).fillIn(vendorInformation.vendorTermsName),
      vendorTermsAccordion.click(),
    ]);
    cy.wait(4000);
    cy.do(accountAccordion.click());
    cy.get('button[data-test-add-account-button="true"]').click();
    cy.do([
      TextField({ name: 'accounts[0].name' }).fillIn(vendorInformation.accountName),
      TextField({ name: 'accounts[0].accountNo' }).fillIn(vendorInformation.accountNumber),
      accountStatus.choose(vendorInformation.accountStatus),
      saveAndClose.click(),
    ]);
    cy.do(saveAndClose.click());
  },

  closeDetailsPane: () => {
    cy.do(PaneHeader({ id: 'paneHeaderpane-organization-details' }).find(timesButton).click());
  },
  closeIntegrationDetailsPane: () => {
    cy.do(PaneHeader({ id: 'paneHeaderintegration-view' }).find(timesButton).click());
  },
  selectCountryFilter: (country) => {
    cy.wait(3000);
    cy.do([
      toggleButtonCountry.click(),
      Button({ id: 'addresses-selection' }).click(),
      SelectionOption(country).click(),
    ]);
  },

  selectLanguageFilter: () => {
    cy.wait(3000);
    cy.do([
      toggleButtonLanguage.click(),
      Button({ id: 'language-selection' }).click(),
      SelectionOption('English').click(),
    ]);
  },

  selectCashInPaymentMethod: () => {
    cy.wait(3000);
    cy.do([toggleButtonPaymentMethod.click(), Checkbox('Cash').click()]);
  },

  deleteOrganizationViaApi: (organizationId) => cy.okapiRequest({
    method: 'DELETE',
    path: `organizations/organizations/${organizationId}`,
    isDefaultSearchParamsRequired: false,
  }),

  addDonorInfoViaApi: (organizationId, requestData) => cy.okapiRequest({
    method: 'PUT',
    path: `organizations/organizations/${organizationId}`,
    isDefaultSearchParamsRequired: false,
    body: requestData,
  }),

  getOrganizationViaApi: (searchParams) => cy
    .okapiRequest({
      path: 'organizations/organizations',
      searchParams,
    })
    .then((response) => {
      return response.body.organizations[0];
    }),

  createOrganizationViaApi: (organization) => cy
    .okapiRequest({
      method: 'POST',
      path: 'organizations/organizations',
      body: organization,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => response.body.id),

  createBankingInformationViaApi: (bankingInformation) => cy
    .okapiRequest({
      method: 'POST',
      path: 'organizations-storage/banking-information',
      body: bankingInformation,
      isDefaultSearchParamsRequired: false,
    })
    .then((resp) => resp.body.id),

  getOrganizationByIdViaApi: (organizationId) => cy
    .okapiRequest({
      method: 'GET',
      path: `organizations-storage/organizations/${organizationId}`,
    })
    .then((resp) => resp.body),

  createContactViaApi: (contact) => cy
    .okapiRequest({
      method: 'POST',
      path: 'organizations-storage/contacts',
      body: contact,
      isDefaultSearchParamsRequired: false,
    })
    .then((resp) => resp.body.id),

  deleteContactViaApi: (id, { failOnStatusCode = true } = {}) => {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `organizations-storage/contacts/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode,
    });
  },

  createInterfaceViaApi: (iface) => cy
    .okapiRequest({
      method: 'POST',
      path: 'organizations-storage/interfaces',
      body: iface,
      isDefaultSearchParamsRequired: false,
    })
    .then((resp) => resp.body.id),

  createInterfaceCredentialsViaApi: (interfaceId, credentials) => cy
    .okapiRequest({
      method: 'POST',
      path: `organizations-storage/interfaces/${interfaceId}/credentials`,
      body: credentials,
      isDefaultSearchParamsRequired: false,
    })
    .then((resp) => resp.status),

  createTagViaApi: (tag) => cy
    .okapiRequest({
      method: 'POST',
      path: 'tags',
      body: typeof tag === 'string' ? { label: tag } : tag,
      isDefaultSearchParamsRequired: false,
    })
    .then((resp) => resp.body.id),

  createPrivilegedContactViaApi: (contact) => cy
    .okapiRequest({
      method: 'POST',
      path: 'organizations-storage/privileged-contacts',
      body: contact,
      isDefaultSearchParamsRequired: false,
    })
    .then((resp) => resp.body.id),

  getTagByLabel(label) {
    const q = `label=="${label}"`;
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'tags',
        searchParams: { query: q, limit: 1 },
        isDefaultSearchParamsRequired: false,
      })
      .then((r) => r.body.tags?.[0] ?? null);
  },

  getPrivilegedContacts({ cql, limit = 10, offset = 0, totalRecords = 'auto' } = {}) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'organizations-storage/privileged-contacts',
        searchParams: { ...(cql ? { query: cql } : {}), limit, offset, totalRecords },
        isDefaultSearchParamsRequired: false,
      })
      .then((r) => r.body.contacts ?? []);
  },

  getPrivilegedContactByName(firstName, lastName) {
    const q = `firstName == "${firstName}" and lastName == "${lastName}"`;
    return this.getPrivilegedContacts({ cql: q, limit: 1 }).then((arr) => arr[0] ?? null);
  },

  deleteTagById(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `tags/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  deletePrivilegedContactsViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `organizations-storage/privileged-contacts/${id}`,
      failOnStatusCode: false,
    });
  },

  editOrganization: () => {
    cy.expect(Spinner().absent());
    cy.expect(actionsButton.exists());
    cy.do(actionsButton.click());
    cy.expect(editButton.exists());
    cy.do(editButton.click());
    cy.wait(2000);
  },

  changeOrganizationStatus: (status) => {
    cy.wait(4000);
    cy.do([organizationStatus.choose(status), saveAndClose.click()]);
    cy.wait(6000);
  },

  verifyNewCategory: (category) => {
    cy.do([
      openContactSectionButton.click(),
      contactPeopleSection.find(addContactButton).click(),
      categoryDropdown.click(),
      cy.contains(category).should('exist'),
    ]);
  },

  addAccount: () => {
    cy.do([
      Button({
        id: 'accordion-toggle-button-org-filter-paymentMethod',
      }).click(),
      Checkbox('Cash').click(),
    ]);
  },

  addCategoryToContact: (category) => {
    cy.do([
      MultiSelect({ label: 'Categories' }).open(),
      MultiSelectMenu().find(MultiSelectOption(category)).clickSegment(),
      MultiSelect({ label: 'Categories' }).close(),
      saveButtonInCotact.click(),
    ]);
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage('The contact was saved');
  },

  addNewContact: (contact) => {
    cy.do([
      openContactSectionButton.click(),
      contactPeopleSection.find(addContactButton).click(),
      addContacsModal.find(buttonNew).click(),
      lastNameField.fillIn(contact.lastName),
      firstNameField.fillIn(contact.firstName),
      saveButtonInCotact.click(),
    ]);
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage('The contact was saved');
  },

  addNewContactWithCategory: (contact, category) => {
    cy.do([
      openContactSectionButton.click(),
      contactPeopleSection.find(addContactButton).click(),
      addContacsModal.find(buttonNew).click(),
      lastNameField.fillIn(contact.lastName),
      firstNameField.fillIn(contact.firstName),
      MultiSelect({ label: 'Categories' }).open(),
      MultiSelectMenu().find(MultiSelectOption(category)).clickSegment(),
      MultiSelect({ label: 'Categories' }).close(),
      saveButtonInCotact.click(),
    ]);
    cy.wait(2000);
    InteractorsTools.checkCalloutMessage('The contact was saved');
  },

  addNewDonorContact: (contact) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-privilegedDonorInformation' }).click(),
      privilegedDonorInformationSection.find(Button('Add donor')).click(),
      addContacsModal.find(buttonNew).click(),
      lastNameField.fillIn(contact.lastName),
      firstNameField.fillIn(contact.firstName),
      saveButtonInCotact.click(),
    ]);
    InteractorsTools.checkCalloutMessage('The contact was saved');
  },

  addNewDonorContactWithFullInformation: (contact) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-privilegedDonorInformation' }).click(),
      privilegedDonorInformationSection.find(Button('Add donor')).click(),
      addContacsModal.find(buttonNew).click(),
      lastNameField.fillIn(contact.lastName),
      firstNameField.fillIn(contact.firstName),
      TextArea({ name: 'notes' }).fillIn(contact.note),
      Select('Status').choose(contact.status),
    ]);
    cy.wait(2000);
    cy.do([
      MultiSelect({ label: 'Categories' }).open(),
      MultiSelectMenu().find(MultiSelectOption(contact.category)).clickSegment(),
      MultiSelect({ label: 'Categories' }).close(),
    ]);
    cy.wait(2000);
    cy.do([
      Button('Add email').click(),
      TextField({ name: 'emails[0].value' }).fillIn(contact.email),
    ]);
    cy.wait(2000);
    cy.do([
      Button('Add phone number').click(),
      TextField({ name: 'phoneNumbers[0].phoneNumber' }).fillIn(contact.phone),
    ]);
    cy.wait(2000);
    cy.do([Button('Add URL').click(), TextField({ name: 'urls[0].value' }).fillIn(contact.url)]);
    cy.wait(2000);
    cy.do(saveButtonInCotact.click());
    InteractorsTools.checkCalloutMessage('The contact was saved');
  },

  openPrivilegedDonorInformationSection: () => {
    cy.do(Button({ id: 'accordion-toggle-button-privilegedDonorInformation' }).click());
  },

  closeAddDonorModal: () => {
    cy.do([addContacsModal.find(Button('Close')).click()]);
  },

  verifyAddDonorButtonIsAbsent: () => {
    cy.expect(Button('Add donor').absent());
  },

  clickAddDonorButton: () => {
    cy.do(privilegedDonorInformationSection.find(Button('Add donor')).click());
  },

  verifyBankingInformationAccordionIsAbsent: () => {
    cy.expect(Section({ id: 'bankingInformationSection' }).absent());
  },

  verifyBankingInformationAccordionIsPresent: () => {
    cy.expect(Section({ id: 'bankingInformationSection' }).exists());
  },

  addDonorContactToOrganization: (contact) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-privilegedDonorInformation' }).click(),
      privilegedDonorInformationSection.find(Button('Add donor')).click(),
      addContacsModal.find(TextField({ id: 'input-record-search' })).fillIn(contact.lastName),
      addContacsModal.find(Button('Search')).click(),
    ]);
    cy.wait(4000);
    cy.do([
      addContacsModal
        .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
        .find(Checkbox())
        .click(),
      addContacsModal.find(saveButton).click(),
    ]);
  },

  deleteContact: () => {
    cy.do([actionsButton.click(), deleteButton.click(), confirmButton.click()]);
  },

  deleteContactFromContactPeople: () => {
    const list = contactPeopleSection.find(MultiColumnList({ id: 'contact-list' }));

    cy.expect(list.exists());
    cy.expect(list.find(MultiColumnListRow({ index: 0 })).exists());

    cy.do(
      list
        .find(MultiColumnListRow({ index: 0 }))
        .find(Button({ ariaLabel: 'Unassign' }))
        .click(),
    );
  },

  deleteDonorFromPrivilegedDonorInformation: () => {
    const list = privilegedDonorInformationSection.find(
      MultiColumnList({ id: 'privilegedContacts' }),
    );

    cy.expect(list.exists());
    cy.expect(list.find(MultiColumnListRow({ index: 0 })).exists());

    cy.do(
      list
        .find(MultiColumnListRow({ index: 0 }))
        .find(Button({ ariaLabel: 'Unassign' }))
        .click(),
    );
  },

  deleteInterfaceFromInterfaces: () => {
    cy.get(
      '#interface-list button[data-test-unassign-interface="true"][aria-label="Unassign"]:visible',
    )
      .first()
      .click();
  },

  selectCategories: (category) => {
    cy.do([
      MultiSelect().select(category),
      saveAndClose.click(),
      timesButton.click(),
      openContactSectionButton.click(),
    ]);
    cy.expect(
      contactPeopleDetails
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: 'claim' }),
    );
    cy.do([timesButton.click()]);
  },

  addNewInterface: (defaultInterface) => {
    cy.do([
      openInterfaceSectionButton.click(),
      interfaceSection.find(addInterfaceButton).click(),
      addInterfacesModal.find(buttonNew).click(),
      TextField({ name: 'name' }).fillIn(defaultInterface.name),
      saveButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage('The interface was saved');
  },

  openContactPeopleSection: () => {
    cy.do(Section({ id: 'contactPeopleSection' }).click());
  },

  openContactPeopleSectionInEditPage: () => {
    cy.do(Button({ id: 'accordion-toggle-button-contactPeopleSection' }).click());
    cy.wait(4000);
  },

  openContactPeopleSectionInEditCard: () => {
    cy.do(openContactSectionButton.click());
  },

  openBankInformationSection: () => {
    cy.do(Button('Banking information').click());
  },

  checkBankInformationExist: (bankingInformationName) => {
    cy.do(Button('Banking information').click());
    cy.expect(
      Section({ id: 'bankingInformationSection' })
        .find(KeyValue({ value: bankingInformationName }))
        .exists(),
    );
  },

  checkBankInformationIsEmpty: () => {
    cy.do(Button('Banking information').click());

    cy.expect(
      Section({ id: 'bankingInformationSection' })
        .find(KeyValue({ value: /.*/ }))
        .absent(),
    );
  },

  addContactToOrganization: (contact) => {
    cy.do([
      openContactSectionButton.click(),
      contactPeopleSection.find(addContactButton).click(),
      addContacsModal.find(SearchField({ id: 'input-record-search' })).fillIn(contact.lastName),
      addContacsModal.find(searchButtonInModal).click(),
    ]);
    cy.wait(6000);
    SearchHelper.selectCheckboxFromResultsList();
    cy.do([addContacsModal.find(saveButton).click(), Button('Save & close').click()]);
    cy.wait(6000);
  },

  filterContactsByStatus: (status) => {
    cy.do([
      openContactSectionButton.click(),
      contactPeopleSection.find(addContactButton).click(),
      contactStatusButton.click(),
      Checkbox(status).click(),
    ]);
    cy.wait(6000);
  },

  selectAllContactsOnPage: () => {
    cy.get('[data-test-find-records-modal-select-all="true"]').click();
  },

  verifyTotalSelected(expected) {
    cy.get('[data-test-find-records-modal-save="true"]')
      .siblings('div')
      .should(($div) => {
        expect($div).to.have.length(1);
        expect($div.text().trim()).to.eq(`Total selected: ${expected}`);
      });
  },

  addContactToOrganizationWithoutSaving: (contact) => {
    cy.do([
      openContactSectionButton.click(),
      contactPeopleSection.find(addContactButton).click(),
      addContacsModal.find(SearchField({ id: 'input-record-search' })).fillIn(contact.lastName),
      addContacsModal.find(searchButtonInModal).click(),
    ]);
    cy.wait(6000);
    SearchHelper.selectCheckboxFromResultsList();
    cy.do([addContacsModal.find(saveButton).click()]);
    cy.wait(6000);
  },

  checkZeroResultsInContactPeopleSearch: (contact) => {
    cy.do([
      contactPeopleSection.find(addContactButton).click(),
      addContacsModal.find(SearchField({ id: 'input-record-search' })).fillIn(contact.lastName),
      addContacsModal.find(searchButtonInModal).click(),
    ]);
    cy.wait(6000);
    cy.xpath(noResultsMessageLabel)
      .should('be.visible')
      .and(
        'have.text',
        `No results found for "${contact.lastName}". Please check your spelling and filters.`,
      );
  },

  addIntrefaceToOrganization: (defaultInterface) => {
    cy.do([
      openInterfaceSectionButton.click(),
      interfaceSection.find(addInterfaceButton).click(),
      addInterfacesModal.find(TextField({ name: 'query' })).fillIn(defaultInterface.name),
      addInterfacesModal.find(searchButtonInModal).click(),
    ]);
    cy.wait(4000);
    cy.do(
      addInterfacesModal
        .find(MultiColumnList())
        .find(MultiColumnListRow({ index: 0 }))
        .find(Checkbox())
        .click(),
    );
    cy.do([addInterfacesModal.find(saveButton).click(), saveAndClose.click()]);
  },

  addIntrefaceToOrganizationAndClickClose: (defaultInterface) => {
    cy.do([
      openInterfaceSectionButton.click(),
      interfaceSection.find(addInterfaceButton).click(),
      addInterfacesModal.find(TextField({ name: 'query' })).fillIn(defaultInterface.name),
      addInterfacesModal.find(searchButtonInModal).click(),
    ]);
    cy.wait(4000);
    SearchHelper.selectCheckboxFromResultsList();
    cy.do([addInterfacesModal.find(Button('Close')).click()]);
  },

  closeContact: () => {
    cy.do(PaneHeader({ id: 'paneHeaderview-contact' }).find(timesButton).click());
  },

  closeEditInterface: () => {
    cy.do(PaneHeader({ id: 'paneHeaderedit-interface' }).find(timesButton).click());
  },

  closeInterface: () => {
    cy.do(Section({ id: 'view-interface' }).find(timesButton).click());
  },

  openInterfaceSection: () => {
    cy.do(openInterfaceSectionButton.click());
  },

  selectInterfaceType: (interfaceType) => {
    // eslint-disable-next-line cypress/no-force
    cy.get('select[name="type"]').select(interfaceType, { force: true });
  },

  addNoteToInterface: (note) => {
    cy.do([TextArea({ name: 'notes' }).fillIn(note)]);
  },

  clickShowInterfaceCredentials: () => {
    cy.do(Button('Show credentials').click());
  },

  verifyPasswordDisplayed(interfceCredentials) {
    const { username, password } = interfceCredentials;
    cy.expect(KeyValue('Username').has({ value: username }));
    cy.expect(KeyValue('Password').has({ value: password }));
  },

  clickSaveButton: () => {
    cy.do(saveButton.click());
  },

  cancelOrganization: () => {
    cy.do(Button('Cancel').click());
  },

  keepEditingOrganization: () => {
    cy.do(
      Modal({ id: 'cancel-editing-confirmation' })
        .find(Button({ id: 'clickable-cancel-editing-confirmation-confirm' }))
        .click(),
    );
  },

  closeWithoutSaving: () => {
    cy.do(
      Modal({ id: 'cancel-editing-confirmation' })
        .find(Button({ id: 'clickable-cancel-editing-confirmation-cancel' }))
        .click(),
    );
  },

  checkContactIsAdd: (contact) => {
    cy.expect(
      privilegedDonorInformationSection
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: `${contact.lastName}, ${contact.firstName}` }),
    );
  },

  checkContactIsAddToContactPeopleSection: (contact) => {
    cy.expect(
      Section({ id: 'contactPeopleSection' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: `${contact.lastName}, ${contact.firstName}` }),
    );
  },

  checkCategoryIsAddToContactPeopleSection: (categories) => {
    categories.forEach((cat) => {
      cy.expect(
        Section({ id: 'contactPeopleSection' })
          .find(MultiColumnListRow({ index: 0 }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(cat) }),
      );
    });
  },

  clickContactRecord: (contact) => {
    const fullName = `${contact.lastName}, ${contact.firstName}`;
    cy.do(
      Section({ id: 'contactPeopleSection' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0, content: fullName }))
        .click(),
    );
  },

  checkContactSectionIsEmpty: () => {
    cy.get('#contactPeopleSection [data-test-accordion-wrapper="true"]').should(
      'contain.text',
      'The list contains no items',
    );
  },

  checkPrivilegedDonorInformationIsEmpty: () => {
    cy.get('#privilegedDonorInformation [data-test-accordion-wrapper="true"]').should(
      'contain.text',
      'The list contains no items',
    );
  },

  checkInterfaceInformationIsEmpty: () => {
    cy.get('#interfacesSection [data-test-accordion-wrapper="true"]').should(
      'contain.text',
      'The list contains no items',
    );
  },

  checkDonorContactIsAdd: (contact, index = 0) => {
    cy.get('#privilegedDonorInformation [data-row-index="row-' + index + '"]').within(() => {
      cy.get('div[class*=mclCell-]').eq(0).contains(`${contact.lastName}, ${contact.firstName}`);
    });
  },

  checkInterfaceSectionIsEmpty: () => {
    cy.get('#interfacesSection [data-test-accordion-wrapper="true"]').should(
      'contain.text',
      'No interface data available',
    );
  },

  checkInterfaceIsAdd: (defaultInterface) => {
    cy.do(openInterfaceSectionButton.click());
    cy.expect(interfaceSection.find(KeyValue({ value: defaultInterface.name })).exists());
  },

  checkInterfaceIsAddInOrganizationDetailsPage: (ifaceName) => {
    cy.do(openInterfaceSectionButton.click());
    const list = interfaceSection.find(MultiColumnList({ id: 'interface-list' }));
    cy.expect(
      list.find(MultiColumnListCell({ column: 'Name', content: including(ifaceName) })).exists(),
    );
  },

  checkInterfaceTypeIsAdd: (interfaceType) => {
    cy.expect(interfaceSection.find(KeyValue({ value: interfaceType })).exists());
  },

  checkInterfaceNoteIsAdd: (interfaceNote) => {
    cy.expect(interfaceSection.find(KeyValue({ value: interfaceNote })).exists());
  },

  selectInterface: (defaultInterface) => {
    cy.do([
      openInterfaceSectionButton.click(),
      MultiColumnListCell({ content: defaultInterface.name }).click(),
    ]);
  },

  deleteInterface: () => {
    cy.do([
      actionsButton.click(),
      Button('Delete').click(),
      Button({ id: 'clickable-delete-interface-modal-confirm' }).click(),
    ]);
  },

  deleteInterfaceFromEditPage: () => {
    cy.get('button[data-test-unassign-interface="true"][aria-label="Unassign"]').click();
  },

  selectContact: (contact) => {
    cy.do([
      contactPeopleSection
        .find(
          MultiColumnListCell({
            content: `${contact.lastName}, ${contact.firstName}`,
          }),
        )
        .click(),
    ]);
  },

  clickEdit: () => {
    cy.do([actionsButton.click(), editButton.click()]);
    cy.wait(2000);
  },

  editFirstAndLastNameInContact: (contact) => {
    cy.do([
      lastNameField.fillIn(`${contact.lastName}-edited`),
      firstNameField.fillIn(`${contact.firstName}-edited`),
      saveButtonInCotact.click(),
    ]);
  },

  editNoteInContact: (note) => {
    cy.do([TextArea({ name: 'notes' }).fillIn(note), saveButtonInCotact.click()]);
  },

  checkContactInOrganizationEditForm: (note) => {
    cy.do(Button({ id: 'accordion-toggle-button-contactPeopleSection' }).click());
    cy.expect(
      Section({ id: 'contactPeopleSection' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .has({ content: note }),
    );
  },

  verifyNoteTruncation(contact, fullNote) {
    const list = MultiColumnList({ id: 'contact-list' });
    const cell = list.find(
      MultiColumnListCell({
        columnIndex: 3,
        content: including(fullNote.slice(0, 10)),
      }),
    );
    cy.expect(cell.exists());

    cy.do(
      cell.perform((el) => {
        const span = el.querySelector('span');
        chai.assert.exists(span, 'note <span> should be present');
        span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        expect(span.getAttribute('title')).to.equal(fullNote);
        expect(span.scrollWidth).to.be.greaterThan(span.clientWidth);
      }),
    );
  },

  checkIntegrationsAdd: (integrationName, integartionDescription) => {
    cy.do([openintegrationDetailsSectionButton.click()]);
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: integrationName }),
    );
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: integartionDescription }),
    );
  },

  checkTwoIntegationsAdd: (
    integrationName1,
    integartionDescription1,
    integrationName2,
    integartionDescription2,
  ) => {
    cy.do([openintegrationDetailsSectionButton.click()]);
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: integrationName1 }),
    );
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: integartionDescription1 }),
    );
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: integrationName2 }),
    );
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: integartionDescription2 }),
    );
  },

  deleteOrganization: (confirm = true) => {
    cy.do([
      PaneHeader({ id: 'paneHeaderpane-organization-details' }).find(actionsButton).click(),
      Button('Delete').click(),
    ]);
    if (confirm) {
      cy.do(
        Button({
          id: 'clickable-delete-organization-confirmation-confirm',
        }).click(),
      );
    }
  },

  selectOrganization: (organizationName) => {
    const trySelect = () => {
      return cy
        .get('#organizations-list')
        .find('a[data-test-text-link="true"]')
        .then(($links) => {
          const el = Array.from($links).find((li) => li.textContent.trim() === organizationName);
          if (el) {
            return cy
              .wrap(el)
              .click()
              .then(() => OrganizationDetails.waitLoading());
          }
          return cy
            .get('div[class^="prevNextPaginationContainer-"]', { timeout: 10000 })
            .within(() => {
              cy.contains('button', 'Next').then(($btn) => {
                cy.wrap($btn).click();
              });
            })
            .then(() => trySelect());
        });
    };
    return trySelect();
  },

  selectOrganizationInCurrentPage: (organizationName) => {
    cy.wait(4000);
    cy.do(Pane({ id: 'organizations-results-pane' }).find(Link(organizationName)).click());
    cy.wait(3000);
    OrganizationDetails.waitLoading();

    return OrganizationDetails;
  },

  organizationIsAbsent: (organizationName) => {
    cy.wait(4000);
    cy.expect(Pane({ id: 'organizations-results-pane' }).find(Link(organizationName)).absent());
  },

  checkTextofElement: () => {
    cy.xpath(numberOfSearchResultsHeader).then(($value) => {
      const textValue = $value.length;
      cy.log(textValue);
    });
  },

  editOrganizationName: (organization) => {
    cy.do([organizationNameField.fillIn(`${organization.name}-edited`), saveAndClose.click()]);
  },

  editOrganizationDescription: (organization) => {
    cy.do([TextArea('Description').fillIn(`${organization.name}-edited`), saveAndClose.click()]);
  },

  unAssignInterface: (defaultInterface) => {
    cy.do(openInterfaceSectionButton.click());
    cy.get('#interface-list')
      .find('a[class^="mclRow-"]')
      .contains('div[class^="mclCell-"]', defaultInterface.name)
      .parents('div[data-row-index]')
      .find('button[aria-label="Unassign"]')
      .click();
  },

  saveOrganization: () => {
    cy.do(saveAndClose.click());
    cy.wait(4000);
  },

  saveAndKeepEditing: () => {
    cy.do(saveAndKeepEditingButton.click());
    cy.wait(4000);
  },

  checkAvailableActionsInTheActionsField: () => {
    cy.do(actionsButton.click());
    cy.expect(editButton.absent());
    cy.expect(deleteButton.absent());
  },

  varifySaveOrganizationCalloutMessage: (organization) => {
    InteractorsTools.checkCalloutMessage(
      `The Organization - "${organization.name}" has been successfully saved`,
    );
  },

  addBankingInformation: (bankingInformation) => {
    cy.do([
      bankingInformationButton.click(),
      bankingInformationAddButton.click(),
      TextField({ name: 'bankingInformation[0].bankName' }).fillIn(bankingInformation.name),
      TextField({ name: 'bankingInformation[0].bankAccountNumber' }).fillIn(
        bankingInformation.accountNumber,
      ),
    ]);
    cy.do(saveAndClose.click());
    cy.wait(4000);
  },

  fillINBankingInformationSection: (bankingInformation) => {
    cy.do([
      bankingInformationButton.click(),
      bankingInformationAddButton.click(),
      TextField({ name: 'bankingInformation[0].bankName' }).fillIn(bankingInformation.name),
      TextField({ name: 'bankingInformation[0].bankAccountNumber' }).fillIn(
        bankingInformation.accountNumber,
      ),
    ]);
  },

  addFullBankingInformation: (bankingInformation) => {
    cy.do([
      bankingInformationButton.click(),
      bankingInformationAddButton.click(),
      TextField({ name: 'bankingInformation[0].bankName' }).fillIn(bankingInformation.name),
      TextField({ name: 'bankingInformation[0].bankAccountNumber' }).fillIn(
        bankingInformation.accountNumber,
      ),
      TextField({ name: 'bankingInformation[0].transitNumber' }).fillIn(
        bankingInformation.transitNumber,
      ),
      TextField({ name: 'bankingInformation[0].notes' }).fillIn(bankingInformation.notes),
      Selection({ name: 'bankingInformation[0].categoryId' }).choose(
        bankingInformation.addressCategory,
      ),
      Selection({ name: 'bankingInformation[0].accountTypeId' }).choose(
        bankingInformation.accountType,
      ),
    ]);
    cy.do(saveAndClose.click());
    cy.wait(4000);
  },

  addSecondBankingInformation: (bankingInformation) => {
    cy.do([
      bankingInformationButton.click(),
      bankingInformationAddButton.click(),
      TextField({ name: 'bankingInformation[1].bankName' }).fillIn(bankingInformation.name),
      TextField({ name: 'bankingInformation[1].bankAccountNumber' }).fillIn(
        bankingInformation.accountNumber,
      ),
      Checkbox({ name: 'bankingInformation[1].isPrimary' }).click(),
    ]);
    cy.do(saveAndClose.click());
    cy.wait(4000);
  },

  closeIntegrationPane: () => {
    cy.do(PaneHeader({ id: 'paneHeaderintegration-view' }).find(timesButton).click());
  },

  closeEditOrganizationPane: () => {
    cy.get(
      'div[data-test-pane-header="true"] button[data-test-pane-header-dismiss-button="true"]',
    ).click();
  },

  editBankingInformationName: (bankingInformationName) => {
    cy.do([
      bankingInformationButton.click(),
      TextField({ name: 'bankingInformation[0].bankName' }).fillIn(bankingInformationName),
    ]);
  },

  deleteBankingInformation: () => {
    cy.do([
      bankingInformationButton.click(),
      Button({ icon: 'trash' }).click(),
      saveAndClose.click(),
    ]);
    cy.wait(4000);
  },

  removeBankingInfoByBankName: (bankName) => {
    cy.do([bankingInformationButton.click()]);
    cy.get(`input[value="${bankName}"]`)
      .parents('[data-test-repeatable-field-list-item]')
      .find('button[data-test-repeatable-field-remove-item-button]')
      .click();
    cy.do(saveAndClose.click());
    cy.wait(1000);
  },

  checkBankingInformationAddButtonIsDisabled: () => {
    cy.expect(Button({ id: 'bankingInformation-add-button' }).has({ disabled: true }));
  },

  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(Button(label).has(conditions));
    });
  },

  filterByDateUpdated(startDate, endDate) {
    cy.do([
      toggleButtonDateUpdated.click(),
      updatedDateAccordion.find(startDateField).fillIn(startDate),
      updatedDateAccordion.find(endDateField).fillIn(endDate),
      updatedDateAccordion.find(applyButton).click(),
    ]);
  },

  checkInvalidDateRangeMessage: (expected = 'Start date is greater than end date') => {
    cy.get('div[role="alert"] [data-test-wrong-dates-order="true"]')
      .should('be.visible')
      .invoke('text')
      .then((t) => expect(t.trim()).to.eq(expected));
  },
};
