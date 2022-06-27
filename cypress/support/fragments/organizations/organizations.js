import { Button, TextField, Select, KeyValue, Accordion, Pane, Checkbox, MultiColumnList, MultiColumnListCell, SearchField, MultiColumnListRow, SelectionOption, Section } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const summaryAccordionId = 'summarySection';
const organizationDetails = Pane({ id: 'pane-organization-details' });
const organizationsList = MultiColumnList({ id: 'organizations-list' });
const blueColor = 'rgba(0, 0, 0, 0)';
const summarySection = Accordion({ id: summaryAccordionId });
const searchInput = SearchField({ id: 'input-record-search' });
const integrationName = `IntegrationName${getRandomPostfix()}`;
const vendorEDICode = `${getRandomPostfix()}`;
const vendorEDICodeEdited = `${getRandomPostfix()}`;
const libraryEDICode = `${getRandomPostfix()}`;
const libraryEDICodeEdited = `${getRandomPostfix()}`;
const serverAddress = 'ftp://ftp.ci.folio.org';
const FTPport = '22';
const ediSection = Section({ id: 'edi' });
const ftpSection = Section({ id: 'ftp' });

export default {
  createOrganizationViaUi: (organization) => {
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      Select('Organization status*').choose(organization.status),
      TextField('Name*').fillIn(organization.name),
      TextField('Code*').fillIn(organization.code),
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

  selectIntegration: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-integrationDetailsSection' }).click(),
      MultiColumnList({ id: 'list-integration-configs' }).find(MultiColumnListCell({ content: integrationName })).click(),
    ]);
  },

  fillIntegrationInformation: () => {
    cy.do([
      Section({ id: 'integrationInfo' }).find(TextField('Integration name*')).fillIn(integrationName),
      ediSection.find(TextField('Vendor EDI code*')).fillIn(vendorEDICode),
      ediSection.find(TextField('Library EDI code*')).fillIn(libraryEDICode),
      ediSection.find(Button({ icon: 'info' })).click()
    ]);
    cy.get('select[name="exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediConfig.accountNoList"]').select('1234');
    cy.do([
      ftpSection.find(Select('EDI FTP')).choose('FTP'),
      ftpSection.find(TextField('Server address*')).fillIn(serverAddress),
      ftpSection.find(TextField('FTP port*')).fillIn(FTPport),
    ]);
    cy.do(saveAndClose.click());
  },

  editIntegrationInformation: () => {
    cy.do([
      Button('Actions').click(),
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
    cy.do(Button('Reset all').click());
  },

  checkSearchResults: (organization) => {
    cy.expect(organizationsList
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: organization.name }));
  },
  selectYesInIsVendor: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-org-filter-isVendor' }).click(),
      Checkbox('Yes').click(),
    ]);
  },

  selectCountryFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-org-filter-addresses' }).click(),
      Button({ id: 'addresses-selection' }).click(),
      SelectionOption('United States').click(),
    ]);
  },

  selectLanguageFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-org-filter-language' }).click(),
      Button({ id: 'language-selection' }).click(),
      SelectionOption('English').click(),
    ]);
  },
  selectCashInPaymentMethod: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-org-filter-paymentMethod' }).click(),
      Checkbox('Cash').click(),
    ]);
  },
  deleteOrganizationApi: (organizationId) => cy.okapiRequest({
    method: 'DELETE',
    path: `organizations/organizations/${organizationId}`,
  }),

  getOrganizationApi: (searchParams) => cy.okapiRequest({
    path: 'organizations/organizations',
    searchParams
  }).then(response => { return response.body.organizations[0]; }),

  createOrganizationApi: (organization) => cy.okapiRequest({
    method: 'POST',
    path: 'organizations/organizations',
    body: organization,
  }).then(response => response.body.id),

};
