import {
  Accordion,
  Button,
  Checkbox,
  HTML,
  IconButton,
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
import DateTools from '../../utils/dateTools';
import InteractorsTools from '../../utils/interactorsTools';
import getRandomPostfix from '../../utils/stringTools';
import SearchHelper from '../finance/financeHelper';

const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const summaryAccordionId = 'summarySection';
const organizationDetails = Pane({ id: 'pane-organization-details' });
const contactPeopleDetails = MultiColumnList({ id: 'contact-list' });
const organizationsList = MultiColumnList({ id: 'organizations-list' });
const blueColor = 'rgba(0, 0, 0, 0)';
const tagButton = Button({ icon: 'tag' });
const tagsButton = Button({ id: 'clickable-show-tags' });
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
const numberOfSearchResultsHeader =
  "//*[@id='paneHeaderorganizations-results-pane-subtitle']/span";
const categoryDropdown = Button('Category');
const zeroResultsFoundText = '0 records found';
const organizationStatus = Select('Organization status*');
const organizationNameField = TextField('Name*');
const organizationCodeField = TextField('Code*');
const today = new Date();
const tagsSection = Section({ id: 'tagsPane' });
const todayDate = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');
const resetButton = Button('Reset all');
const openContactSectionButton = Button({
  id: 'accordion-toggle-button-contactPeopleSection',
});
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
const openintegrationDetailsSectionButton = Button({
  id: 'accordion-toggle-button-integrationDetailsSection',
});
const listIntegrationConfigs = MultiColumnList({
  id: 'list-integration-configs',
});

export default {
  waitLoading: () => {
    cy.expect(Pane({ id: 'organizations-results-pane' }).exists());
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  addTag: () => {
    const newTag = `tag${getRandomPostfix()}`;
    cy.then(() => tagsSection.find(MultiSelect()).selected()).then(
      (selectedTags) => {
        cy.wait(2000).then(() => {
          cy.do(tagsSection.find(MultiSelect()).fillIn(newTag));
          cy.do(tagsSection.find(MultiSelectOption({ index: 0 })).click());
          cy.expect(
            tagsSection
              .find(MultiSelect({ selected: [...selectedTags, newTag].sort() }))
              .exists()
          );
        });
      }
    );
    return newTag;
  },

  createOrganizationViaUi: (organization) => {
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      organizationStatus.choose(organization.status),
      organizationNameField.fillIn(organization.name),
      organizationCodeField.fillIn(organization.code),
      saveAndClose.click(),
    ]);
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

  checkCreatedOrganization: (organization) => {
    cy.expect(organizationDetails.exists());
    cy.expect(
      summarySection.find(KeyValue({ value: organization.name })).exists()
    );
    cy.expect(
      summarySection.find(KeyValue({ value: organization.code })).exists()
    );
  },

  organizationTagDetails: () => {
    cy.do([tagButton.click()]);
  },

  verifyTagCount(count = '1') {
    cy.expect(tagsButton.find(HTML(including(count))).exists());
  },

  tagsPane: () => {
    cy.do(PaneHeader({ id: 'paneHeadertagsPane' }).find(timesButton).click());
  },

  tagFilter: (tags) => {
    cy.do([
      Section({ id: 'org-filter-tags' }).find(Button('Tags')).click(),
      Button({ className: 'multiSelectToggleButton---cD_fu' }).click(),
      MultiSelectOption(tags).click(),
    ]);
  },

  selectActiveStatus: () => {
    cy.do(Checkbox('Active').click());
  },

  selectInActiveStatus: () => {
    cy.do(Checkbox('Inactive').click());
  },

  selectPendingStatus: () => {
    cy.do(Checkbox('Pending').click());
  },

  checkOrganizationFilter: () => {
    cy.expect(organizationsList.exists());
  },

  chooseOrganizationFromList: (organization) => {
    cy.do(
      organizationsList
        .find(MultiColumnListCell({ content: organization.name }))
        .click()
    );
  },

  addIntegration: () => {
    cy.do([
      openintegrationDetailsSectionButton.click(),
      Button({ id: 'clickable-neworganization-integration' }).click(),
    ]);
  },

  selectIntegration: (integrationName) => {
    cy.do([
      openintegrationDetailsSectionButton.click(),
      listIntegrationConfigs
        .find(MultiColumnListCell({ content: integrationName }))
        .click(),
    ]);
  },

  fillIntegrationInformation: (
    integrationName,
    integartionDescription,
    vendorEDICode,
    libraryEDICode,
    accountNumber,
    acquisitionMethod,
    UTCTime
  ) => {
    cy.do([
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
      "select[name='exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.accountNoList']"
    ).select(accountNumber);
    cy.get(
      "select[name='exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.defaultAcquisitionMethods']"
    ).select(acquisitionMethod);
    cy.do([
      ftpSection.find(Select('EDI FTP')).choose('FTP'),
      ftpSection.find(TextField('Server address*')).fillIn(serverAddress),
      ftpSection.find(TextField('FTP port*')).fillIn(FTPport),
      ftpSection.find(TextField('Username')).fillIn('folio'),
      ftpSection.find(TextField('Password')).fillIn('Ffx29%pu'),
      ftpSection.find(TextField('Order directory')).fillIn('/files'),
      schedulingSection
        .find(
          Checkbox({
            name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.enableScheduledExport',
          })
        )
        .click(),
      schedulingSection.find(TextField('Schedule frequency*')).fillIn('1'),
      schedulingSection
        .find(
          Select({
            name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.scheduleParameters.schedulePeriod',
          })
        )
        .choose('Daily'),
      schedulingSection
        .find(
          TextField({
            name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.scheduleParameters.schedulingDate',
          })
        )
        .fillIn(`${todayDate}`),
      schedulingSection.find(TextField('Time*')).fillIn(`${UTCTime}`),
    ]);
    cy.do(saveAndClose.click());
  },

  fillIntegrationInformationWithoutScheduling: (
    integrationName,
    integartionDescription,
    vendorEDICode,
    libraryEDICode,
    accountNumber,
    acquisitionMethod
  ) => {
    cy.do([
      Section({ id: 'integrationInfo' })
        .find(TextField('Integration name*'))
        .fillIn(integrationName),
      TextArea('Description').fillIn(integartionDescription),
      ediSection.find(TextField('Vendor EDI code*')).fillIn(vendorEDICode),
      ediSection.find(TextField('Library EDI code*')).fillIn(libraryEDICode),
      ediSection.find(Button({ icon: 'info' })).click(),
      Checkbox({
        name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.supportInvoice',
      }).click(),
    ]);
    cy.get(
      "select[name='exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.accountNoList']"
    ).select(accountNumber);
    cy.get(
      "select[name='exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.defaultAcquisitionMethods']"
    ).select(acquisitionMethod);
    cy.do([
      ftpSection.find(Select('EDI FTP')).choose('FTP'),
      ftpSection.find(TextField('Server address*')).fillIn(serverAddress),
      ftpSection.find(TextField('FTP port*')).fillIn(FTPport),
    ]);
    cy.do(saveAndClose.click());
  },

  editIntegrationInformation: () => {
    cy.do([
      actionsButton.click(),
      editButton.click(),
      ediSection
        .find(TextField('Vendor EDI code*'))
        .fillIn(vendorEDICodeEdited),
      ediSection
        .find(TextField('Library EDI code*'))
        .fillIn(libraryEDICodeEdited),
      saveAndClose.click(),
    ]);
  },

  expectColorFromList: () => {
    cy.get('#organizations-list').should(
      'have.css',
      'background-color',
      blueColor
    );
  },

  checkOpenOrganizationInfo: (organization) => {
    cy.expect(organizationDetails.exists());
    cy.expect(
      summarySection.find(KeyValue({ value: organization.name })).exists()
    );
    cy.expect(
      summarySection.find(KeyValue({ value: organization.code })).exists()
    );
  },

  searchByParameters: (parameter, value) => {
    cy.do([
      searchInput.selectIndex(parameter),
      searchInput.fillIn(value),
      Button('Search').click(),
    ]);
  },

  resetFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true })); // Assertion gets failed due to in bugfest Url Reset All button is enabled by default
  },

  verifyResetFilters: () => {
    cy.expect(
      Section({ id: 'organizations-results-pane' })
        .find(
          HTML(
            including(
              'Choose a filter or enter a search query to show results.'
            )
          )
        )
        .exists()
    );
  },
  checkSearchResults: (organization) => {
    cy.expect(
      organizationsList
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .has({ content: organization.name })
    );
  },

  checkOrganizationNameSearchResults: (code) => {
    cy.expect(
      organizationsList
        .find(MultiColumnListCell({ row: 0, columnIndex: 1 }))
        .has({ content: code })
    );
  },

  selectYesInIsVendor: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-org-filter-isVendor' }).click(),
      Checkbox('Yes').click(),
    ]);
  },

  selectNoInIsVendor: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-org-filter-isVendor' }).click(),
      Checkbox('No').click(),
    ]);
  },

  selectVendor: () => {
    cy.do(Checkbox('Vendor').click());
    cy.expect(Checkbox({ name: 'isVendor', disabled: false }).exists());
    cy.do(saveAndClose.click());
  },

  verifyVendorExists: () => {
    cy.expect(
      Section({ id: 'summarySection' })
        .find(Checkbox({ checked: true }))
        .exists()
    );
  },

  closeDetailsPane() {
    cy.expect(timesButton.exists());
    // need to wait before closing the pane
    cy.wait(2000);
    cy.do(timesButton.click());
  },

  selectCountryFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-plugin-country-filter' }).click(),
      Button({ id: 'addresses-selection' }).click(),
      SelectionOption('United States').click(),
    ]);
  },

  selectLanguageFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-plugin-language-filter' }).click(),
      Button({ id: 'language-selection' }).click(),
      SelectionOption('English').click(),
    ]);
  },

  selectCashInPaymentMethod: () => {
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
    cy.expect(actionsButton.exists());
    cy.do([actionsButton.click(), editButton.click()]);
  },

  verifynewCategory: (category) => {
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
    cy.expect(openContactSectionButton.exists());
    cy.do([
      openContactSectionButton.click(),
      contactPeopleSection.find(addContactButton).click(),
      addContacsModal.find(buttonNew).click(),
      lastNameField.fillIn(contact.lastName),
      firstNameField.fillIn(contact.firstName),
      Button('Save & close').click(),
    ]);
    InteractorsTools.checkCalloutMessage('The contact was saved');
  },

  deleteContact: () => {
    cy.do([actionsButton.click(), deleteButton.click()]);
    cy.expect(confirmButton.exists());
    cy.do(confirmButton.click());
    cy.expect(contactPeopleSection.exists());
    cy.do(openContactSectionButton.click());
  },

  verifyDeletedContact: () => {
    cy.expect(contactPeopleDetails.absent());
  },

  selectAndVerifyCategories: (category) => {
    cy.expect(MultiSelect().exists());
    cy.do([MultiSelect().select(category), saveAndClose.click()]);
    cy.expect(
      Section({ id: 'view-contact' })
        .find(IconButton({ icon: 'times' }))
        .exists()
    );
    cy.do([
      timesButton.click(),
      contactPeopleSection.find(openContactSectionButton).click(),
    ]);
    cy.expect(
      contactPeopleDetails
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: 'claim' })
    );
    cy.expect(timesButton.exists());
    cy.do(timesButton.click());
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
    cy.do([openContactSectionButton.click()]);
  },

  selectCheckboxFromResultsList: (rowNumber = 0) => {
    cy.expect(Spinner().exists());
    cy.do(MultiColumnListRow({ index: rowNumber }).find(Checkbox()).click());
  },

  addContactToOrganization(contact) {
    cy.expect(openContactSectionButton.exists());
    cy.do([
      openContactSectionButton.click(),
      contactPeopleSection.find(addContactButton).click(),
      addContacsModal
        .find(SearchField({ id: 'input-record-search' }))
        .fillIn(contact.lastName),
    ]);
    cy.expect(addContacsModal.exists());
    cy.do(addContacsModal.find(searchButtonInModal).click());
    this.selectCheckboxFromResultsList();
    cy.do([
      addContacsModal.find(saveButton).click(),
      Button({ id: 'organization-form-save' }).click(),
    ]);
  },

  verifySavedContactToOrganization(contact) {
    cy.expect(
      contactPeopleSection
        .find(MultiColumnListRow({ index: 0 }))
        .has({ content: contact })
    );
  },

  addIntrefaceToOrganization: (defaultInterface) => {
    cy.do([
      openInterfaceSectionButton.click(),
      interfaceSection.find(addInterfaceButton).click(),
      addInterfacesModal
        .find(TextField({ name: 'query' }))
        .fillIn(defaultInterface.name),
      addInterfacesModal.find(searchButtonInModal).click(),
    ]);
    cy.wait(4000);
    SearchHelper.selectCheckboxFromResultsList();
    cy.do([
      addInterfacesModal.find(saveButton).click(),
      Button({ id: 'organization-form-save' }).click(),
    ]);
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

  checkContactIsAdd: (contact) => {
    cy.expect(
      contactPeopleSection
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: `${contact.lastName}, ${contact.firstName}` })
    );
  },

  checkInterfaceIsAdd: (defaultInterface) => {
    cy.do(openInterfaceSectionButton.click());
    cy.expect(
      interfaceSection.find(KeyValue({ value: defaultInterface.name })).exists()
    );
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
    cy.expect(contactPeopleSection.exists());
    cy.do([
      contactPeopleSection
        .find(
          MultiColumnListCell({
            content: `${contact.lastName}, ${contact.firstName}`,
          })
        )
        .click(),
    ]);
  },

  editContact: (contact) => {
    cy.do([
      actionsButton.click(),
      editButton.click(),
      lastNameField.fillIn(`${contact.lastName}-edited`),
      firstNameField.fillIn(`${contact.firstName}-edited`),
      saveButtonInCotact.click(),
    ]);
  },

  checkIntegrationsAdd: (integrationName, integartionDescription) => {
    cy.do([openintegrationDetailsSectionButton.click()]);
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: integrationName })
    );
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: integartionDescription })
    );
  },

  checkTwoIntegationsAdd: (
    integrationName1,
    integartionDescription1,
    integrationName2,
    integartionDescription2
  ) => {
    cy.do([openintegrationDetailsSectionButton.click()]);
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: integrationName1 })
    );
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: integartionDescription1 })
    );
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: integrationName2 })
    );
    cy.expect(
      listIntegrationConfigs
        .find(MultiColumnListRow({ index: 1 }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: integartionDescription2 })
    );
  },

  deleteOrganization: () => {
    cy.do([
      PaneHeader({ id: 'paneHeaderpane-organization-details' })
        .find(actionsButton)
        .click(),
      Button('Delete').click(),
      Button({
        id: 'clickable-delete-organization-confirmation-confirm',
      }).click(),
    ]);
  },

  selectOrganization: (organizationName) => {
    cy.do(
      Pane({ id: 'organizations-results-pane' })
        .find(Link(organizationName))
        .click()
    );
  },

  editOrganizationName: (organization) => {
    cy.do([
      organizationNameField.fillIn(`${organization.name}-edited`),
      saveAndClose.click(),
    ]);
  },

  unAssignInterface: (defaultInterface) => {
    cy.do(openInterfaceSectionButton.click());
    cy.get('#interface-list')
      .find("a[class^='mclRow-']")
      .contains("div[class^='mclCell-']", defaultInterface.name)
      .parents('div[data-row-index]')
      .find("button[aria-label='Unassign']")
      .click();
  },

  saveOrganization: () => {
    cy.do(saveAndClose.click());
  },
};
