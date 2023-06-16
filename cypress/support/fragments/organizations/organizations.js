import { Button, TextField, Select, KeyValue, Accordion, Pane, Checkbox, MultiColumnList, MultiColumnListCell, SearchField, MultiColumnListRow, SelectionOption, Section, TextArea, MultiSelect, MultiSelectOption, PaneHeader, Link, Modal } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import DateTools from '../../utils/dateTools';
import SearchHelper from '../finance/financeHelper';
import InteractorsTools from '../../utils/interactorsTools';

const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const summaryAccordionId = 'summarySection';
const organizationDetails = Pane({ id: 'pane-organization-details' });
const organizationsList = MultiColumnList({ id: 'organizations-list' });
const blueColor = 'rgba(0, 0, 0, 0)';
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
const zeroResultsFoundText = '0 records found';
const organizationStatus = Select('Organization status*');
const organizationNameField = TextField('Name*');
const organizationCodeField = TextField('Code*');
const today = new Date();
const todayDate = DateTools.getFormattedDate({ date: today }, 'MM/DD/YYYY');
const resetButton = Button('Reset all');

export default {

  waitLoading : () => {
    cy.expect(Pane({ id: 'organizations-results-pane' }).exists());
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  createOrganizationViaUi: (organization) => {
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      organizationStatus.choose(organization.status),
      organizationNameField.fillIn(organization.name),
      organizationCodeField.fillIn(organization.code),
      saveAndClose.click()
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
      MultiSelect({ id: 'org-acq-units' }).find(Button({ ariaLabel: 'open menu' })).click(),
      MultiSelectOption(AcquisitionUnit).click(),
      saveAndClose.click()
    ]);
  },

  checkCreatedOrganization: (organization) => {
    cy.expect(organizationDetails.exists());
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(summarySection.find(KeyValue({ value: organization.code })).exists());
  },

  selectActiveStatus: () => {
    cy.do(Checkbox('Active').click());
  },

  checkOrganizationFilter: () => {
    cy.expect(organizationsList.exists());
  },

  chooseOrganizationFromList: (organization) => {
    cy.do(organizationsList
      .find(MultiColumnListCell({ content: organization.name }))
      .click());
  },

  addIntegration: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-integrationDetailsSection' }).click(),
      Button({ id: 'clickable-neworganization-integration' }).click(),
    ]);
  },

  selectIntegration: (integrationName) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-integrationDetailsSection' }).click(),
      MultiColumnList({ id: 'list-integration-configs' }).find(MultiColumnListCell({ content: integrationName })).click(),
    ]);
  },

  fillIntegrationInformation: (integrationName, integartionDescription, vendorEDICode, libraryEDICode, accountNumber, acquisitionMethod, UTCTime) => {
    cy.do([
      Section({ id: 'integrationInfo' }).find(TextField('Integration name*')).fillIn(integrationName),
      TextArea('Description').fillIn(integartionDescription),
      ediSection.find(TextField('Vendor EDI code*')).fillIn(vendorEDICode),
      ediSection.find(TextField('Library EDI code*')).fillIn(libraryEDICode),
      ediSection.find(Button({ icon: 'info' })).click(),
      Checkbox({ name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.supportOrder' }).click(),
      Checkbox({ name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.supportInvoice' }).click(),
    ]);
    cy.get('select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.accountNoList"]').select(accountNumber);
    cy.get('select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.defaultAcquisitionMethods"]').select(acquisitionMethod);
    cy.do([
      ftpSection.find(Select('EDI FTP')).choose('FTP'),
      ftpSection.find(TextField('Server address*')).fillIn(serverAddress),
      ftpSection.find(TextField('FTP port*')).fillIn(FTPport),
      ftpSection.find(TextField('Username')).fillIn('folio'),
      ftpSection.find(TextField('Password')).fillIn('Ffx29%pu'),
      ftpSection.find(TextField('Order directory')).fillIn('/files'),
      schedulingSection.find(Checkbox({ name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.enableScheduledExport' })).click(),
      schedulingSection.find(TextField('Schedule frequency*')).fillIn('1'),
      schedulingSection.find(Select({ name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.scheduleParameters.schedulePeriod' })).choose('Daily'),
      schedulingSection.find(TextField({ name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.scheduleParameters.schedulingDate' })).fillIn(`${todayDate}`),
      schedulingSection.find(TextField('Time*')).fillIn(`${UTCTime}`),
    ]);
    cy.do(saveAndClose.click());
  },

  fillIntegrationInformationWithoutScheduling: (integrationName, integartionDescription, vendorEDICode, libraryEDICode, accountNumber, acquisitionMethod) => {
    cy.do([
      Section({ id: 'integrationInfo' }).find(TextField('Integration name*')).fillIn(integrationName),
      TextArea('Description').fillIn(integartionDescription),
      ediSection.find(TextField('Vendor EDI code*')).fillIn(vendorEDICode),
      ediSection.find(TextField('Library EDI code*')).fillIn(libraryEDICode),
      ediSection.find(Button({ icon: 'info' })).click(),
      Checkbox({ name: 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.supportInvoice' }).click(),
    ]);
    cy.get('select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.accountNoList"]').select(accountNumber);
    cy.get('select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.defaultAcquisitionMethods"]').select(acquisitionMethod);
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
      Button('Edit').click(),
      ediSection.find(TextField('Vendor EDI code*')).fillIn(vendorEDICodeEdited),
      ediSection.find(TextField('Library EDI code*')).fillIn(libraryEDICodeEdited),
      saveAndClose.click(),
    ]);
  },

  expectColorFromList: () => {
    cy.get('#organizations-list').should('have.css', 'background-color', blueColor);
  },

  checkOpenOrganizationInfo: (organization) => {
    cy.expect(organizationDetails.exists());
    cy.expect(summarySection.find(KeyValue({ value: organization.name })).exists());
    cy.expect(summarySection.find(KeyValue({ value: organization.code })).exists());
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
    cy.expect(resetButton.is({ disabled: true }));
  },

  checkSearchResults: (organization) => {
    cy.expect(organizationsList
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: organization.name }));
  },
  selectYesInIsVendor: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-isVendor' }).click(),
      Checkbox('Yes').click(),
    ]);
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

  getOrganizationViaApi: (searchParams) => cy.okapiRequest({
    path: 'organizations/organizations',
    searchParams
  }).then(response => { return response.body.organizations[0]; }),

  createOrganizationViaApi: (organization) => cy.okapiRequest({
    method: 'POST',
    path: 'organizations/organizations',
    body: organization,
    isDefaultSearchParamsRequired: false,
  }).then(response => response.body.id),

  editOrganization: () => {
    cy.do([
      actionsButton.click(),
      Button('Edit').click(),
    ]);
  },

  addAccount: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-org-filter-paymentMethod' }).click(),
      Checkbox('Cash').click(),
    ]);
  },

  addNewContact: (contact) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-contactPeopleSection' }).click(),
      Section({ id: 'contactPeopleSection' }).find(Button('Add contact')).click(),
      Modal('Add contacts').find(Button('New')).click(),
      TextField({ name: 'lastName' }).fillIn(contact.lastName),
      TextField({ name: 'firstName' }).fillIn(contact.firstName),
      Button({ id: 'clickable-save-contact-person-footer' }).click()
    ]);
    InteractorsTools.checkCalloutMessage('The contact was saved');
  },

  addContactToOrganization: (contact) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-contactPeopleSection' }).click(),
      Section({ id: 'contactPeopleSection' }).find(Button('Add contact')).click(),
      Modal('Add contacts').find(SearchField({ id: 'input-record-search' })).fillIn(contact.lastName),
      Modal('Add contacts').find(Button({ type: 'submit' })).click()
    ]);
    cy.wait(4000);
    SearchHelper.selectCheckboxFromResultsList();
    cy.do([
      Modal('Add contacts').find(Button('Save')).click(),
      Button({ id: 'organization-form-save' }).click()
    ]);
  },

  closeContact: () => {
    cy.do(Section({ id: 'view-contact' }).find(Button({ icon: 'times' })).click());
  },

  cancelOrganization: () => {
    cy.do(Button('Cancel').click());
  },

  checkContactIsAdd: (contact) => {
    cy.expect(Section({ id: 'contactPeopleSection' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: `${contact.lastName}, ${contact.firstName}` }));
  },

  selectContact: (contact) => {
    cy.wait(4000);
    cy.do([
      Section({ id: 'contactPeopleSection' }).find(MultiColumnListCell({ content: `${contact.lastName}, ${contact.firstName}` })).click(),
    ]);
  },

  editContact: (contact) => {
    cy.do([
      actionsButton.click(),
      Button('Edit').click(),
      TextField({ name: 'lastName' }).fillIn(`${contact.lastName}-edited`),
      TextField({ name: 'firstName' }).fillIn(`${contact.firstName}-edited`),
      Button({ id: 'clickable-save-contact-person-footer' }).click()
    ]);
  },

  checkIntegrationsAdd: (integrationName, integartionDescription) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-integrationDetailsSection' }).click(),
    ]);
    cy.expect(MultiColumnList({ id: 'list-integration-configs' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: integrationName }));
    cy.expect(MultiColumnList({ id: 'list-integration-configs' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 1 }))
      .has({ content: integartionDescription }));
  },

  checkTwoIntegationsAdd: (integrationName1, integartionDescription1, integrationName2, integartionDescription2) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-integrationDetailsSection' }).click(),
    ]);
    cy.expect(MultiColumnList({ id: 'list-integration-configs' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: integrationName1 }));
    cy.expect(MultiColumnList({ id: 'list-integration-configs' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 1 }))
      .has({ content: integartionDescription1 }));
    cy.expect(MultiColumnList({ id: 'list-integration-configs' })
      .find(MultiColumnListRow({ index: 1 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: integrationName2 }));
    cy.expect(MultiColumnList({ id: 'list-integration-configs' })
      .find(MultiColumnListRow({ index: 1 }))
      .find(MultiColumnListCell({ columnIndex: 1 }))
      .has({ content: integartionDescription2 }));
  },

  deleteOrganization: () => {
    cy.do([
      PaneHeader({ id: 'paneHeaderpane-organization-details' }).find(actionsButton).click(),
      Button('Delete').click(),
      Button({ id: 'clickable-delete-organization-confirmation-confirm' }).click()
    ]);
  },

  selectOrganization:(organizationName) => {
    cy.do(Pane({ id: 'organizations-results-pane' }).find(Link(organizationName)).click());
  },

  editOrganizationName: (organization) => {
    cy.do([
      organizationNameField.fillIn(`${organization.name}-edited`),
      saveAndClose.click()
    ]);
  },
};
