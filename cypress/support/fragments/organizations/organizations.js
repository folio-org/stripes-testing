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
  SelectionOption,
  Spinner,
  TextArea,
  TextField,
  including,
} from '../../../../interactors';
import { AppList } from '../../../../interactors/applist';
import InteractorsTools from '../../utils/interactorsTools';
import getRandomPostfix from '../../utils/stringTools';
import SearchHelper from '../finance/financeHelper';
import OrganizationDetails from './organizationDetails';
import DateTools from '../../utils/dateTools';

const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const summaryAccordionId = 'summarySection';
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

export default {
  waitLoading: () => {
    cy.expect(Pane({ id: 'organizations-results-pane' }).exists());
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
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

  organizationTagDetails: () => {
    cy.do([tagButton.click()]);
  },

  tagFilter: () => {
    cy.do([
      Section({ id: 'org-filter-tags' }).find(Button('Tags')).click(),
      Button({ className: 'multiSelectToggleButton---cD_fu' }).click(),
      MultiSelectOption('^').click(),
    ]);
  },

  selectActiveStatus: () => {
    cy.do(Checkbox('Active').click());
  },

  selectPendingStatus: () => {
    cy.wait(3000);
    cy.do(Checkbox('Pending').click());
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

  checkIsaDonor: (organization) => {
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(summarySection.find(donorCheckbox).is({ visible: true, disabled: false }));
  },

  checkIsNotaDonor: (organization) => {
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(summarySection.find(donorCheckbox).is({ visible: true, disabled: true }));
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

  checkSearchResults: (organization) => {
    cy.wait(4000);
    cy.expect(organizationsList.find(Link(organization.name)).exists());
  },

  selectYesInIsVendor: () => {
    cy.do([Button({ id: 'accordion-toggle-button-isVendor' }).click(), Checkbox('Yes').click()]);
  },

  selectNoInIsVendor: () => {
    cy.wait(3000);
    cy.do([Button({ id: 'accordion-toggle-button-isVendor' }).click(), Checkbox('No').click()]);
  },

  selectVendor: () => {
    cy.do([Checkbox('Vendor').click(), saveAndClose.click()]);
  },

  deselectVendor: () => {
    cy.do([Checkbox('Vendor').click(), confirmButton.click(), saveAndClose.click()]);
  },

  closeDetailsPane: () => {
    cy.do(PaneHeader({ id: 'paneHeaderpane-organization-details' }).find(timesButton).click());
  },
  closeIntegrationDetailsPane: () => {
    cy.do(PaneHeader({ id: 'paneHeaderintegration-view' }).find(timesButton).click());
  },
  selectCountryFilter: () => {
    cy.wait(3000);
    cy.do([
      Button({ id: 'accordion-toggle-button-plugin-country-filter' }).click(),
      Button({ id: 'addresses-selection' }).click(),
      SelectionOption('United States').click(),
    ]);
  },

  selectLanguageFilter: () => {
    cy.wait(3000);
    cy.do([
      Button({ id: 'accordion-toggle-button-plugin-language-filter' }).click(),
      Button({ id: 'language-selection' }).click(),
      SelectionOption('English').click(),
    ]);
  },

  selectCashInPaymentMethod: () => {
    cy.wait(3000);
    cy.do([
      Button({ id: 'accordion-toggle-button-paymentMethod' }).click(),
      Checkbox('Cash').click(),
    ]);
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

  editOrganization: () => {
    cy.expect(Spinner().absent());
    cy.expect(actionsButton.exists());
    cy.do(actionsButton.click());
    cy.expect(editButton.exists());
    cy.do(editButton.click());
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

  addNewContact: (contact) => {
    cy.do([
      openContactSectionButton.click(),
      contactPeopleSection.find(addContactButton).click(),
      addContacsModal.find(buttonNew).click(),
      lastNameField.fillIn(contact.lastName),
      firstNameField.fillIn(contact.firstName),
      saveButtonInCotact.click(),
    ]);
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

  openPrivilegedDonorInformationSection: () => {
    cy.do(Button({ id: 'accordion-toggle-button-privilegedDonorInformation' }).click());
  },

  verifyAddDonorButtonIsAbsent: () => {
    cy.expect(Button('Add donor').absent());
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

  addIntrefaceToOrganization: (defaultInterface) => {
    cy.do([
      openInterfaceSectionButton.click(),
      interfaceSection.find(addInterfaceButton).click(),
      addInterfacesModal.find(TextField({ name: 'query' })).fillIn(defaultInterface.name),
      addInterfacesModal.find(searchButtonInModal).click(),
    ]);
    cy.wait(4000);
    SearchHelper.selectCheckboxFromResultsList();
    cy.do([addInterfacesModal.find(saveButton).click(), saveAndClose.click()]);
  },

  closeContact: () => {
    cy.do(Section({ id: 'view-contact' }).find(timesButton).click());
  },

  closeInterface: () => {
    cy.do(Section({ id: 'view-interface' }).find(timesButton).click());
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

  checkDonorContactIsAdd: (contact, index = 0) => {
    cy.get('#privilegedDonorInformation [data-row-index="row-' + index + '"]').within(() => {
      cy.get('div[class*=mclCell-]').eq(0).contains(`${contact.lastName}, ${contact.firstName}`);
    });
  },

  checkInterfaceIsAdd: (defaultInterface) => {
    cy.do(openInterfaceSectionButton.click());
    cy.expect(interfaceSection.find(KeyValue({ value: defaultInterface.name })).exists());
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

  editContact: () => {
    cy.do([actionsButton.click(), editButton.click()]);
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

  addSecondBankingInformation: (bankingInformation) => {
    cy.do([
      bankingInformationButton.click(),
      bankingInformationAddButton.click(),
      TextField({ name: 'bankingInformation[1].bankName' }).fillIn(bankingInformation.name),
      TextField({ name: 'bankingInformation[1].bankAccountNumber' }).fillIn(
        bankingInformation.accountNumber,
      ),
    ]);
    cy.do(saveAndClose.click());
    cy.wait(4000);
  },

  closeIntegrationPane: () => {
    cy.do(PaneHeader({ id: 'paneHeaderintegration-view' }).find(timesButton).click());
  },

  editBankingInformationName: (bankingInformationName) => {
    cy.do([
      bankingInformationButton.click(),
      TextField({ name: 'bankingInformation[0].bankName' }).fillIn(bankingInformationName),
    ]);
  },

  deleteBankingInformation: () => {
    cy.do([bankingInformationButton.click()]);
    cy.get('[data-test-repeatable-field-remove-item-button="true"]', { timeout: 15000 })
      .first()
      .click();
    cy.do(saveAndClose.click());
    cy.wait(4000);
  },

  checkBankingInformationAddButtonIsDisabled: () => {
    cy.expect(Button({ id: 'bankingInformation-add-button' }).has({ disabled: true }));
  },

  removeBankingInfoByBankName: (bankName) => {
    cy.do([bankingInformationButton.click()]);
    cy.get(`input[value="${bankName}"]`)
      .parents('[data-test-repeatable-field-list-item]')
      .find('button[data-test-repeatable-field-remove-item-button]')
      .click();
    cy.do(saveAndClose.click());
    cy.wait(500);
  },
};
