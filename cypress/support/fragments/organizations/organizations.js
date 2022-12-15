import { Button, TextField, Select, KeyValue, Accordion, Pane, Checkbox, MultiColumnList, MultiColumnListCell, SearchField, MultiColumnListRow, SelectionOption, Section, TextArea, MultiSelect, MultiSelectOption, PaneHeader, Link } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

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
const actionsButton = Button('Actions');
const numberOfSearchResultsHeader = '//*[@id="paneHeaderorganizations-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';
const organizationStatus = Select('Organization status*');
const organizationName = TextField('Name*');
const organizationCode = TextField('Code*');

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
      organizationName.fillIn(organization.name),
      organizationCode.fillIn(organization.code),
      saveAndClose.click()
    ]);
  },

  createOrganizationWithAU: (organization,AcquisitionUnit) => {
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      organizationStatus.choose(organization.status),
      organizationName.fillIn(organization.name),
      organizationCode.fillIn(organization.code),
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

  fillIntegrationInformation: (integrationName, integartionDescription, vendorEDICode, libraryEDICode, accountNumber, acquisitionMethod) => {
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
    cy.do(Section({ id: 'paneHeaderorganizations-results-pane' }).find(Link(organizationName)).click());
  },
};
