import { HTML, including, matching } from '@interactors/html';
import {
  Accordion,
  Button,
  Callout,
  Checkbox,
  KeyValue,
  Link,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneHeader,
  Section,
  TextField,
  Layer,
} from '../../../../../../interactors';
import FieldMappingProfileEditForm from './fieldMappingProfileEditForm';

const mappingProfileView = Section({ id: 'full-screen-view' });

const summarySection = mappingProfileView.find(Section({ id: 'view-summary' }));
const detailsSection = mappingProfileView.find(Section({ id: 'view-mapping-profile-details' }));
const adminDataSection = detailsSection.find(Section({ id: 'view-administrative-data' }));
const actionProfilesSection = mappingProfileView.find(
  Section({ id: 'view-mappingProfileFormAssociatedActionProfileAccordion' }),
);
const instancesTagsSection = Section({ id: including('Tags') });
const actionsButton = mappingProfileView.find(Button('Actions'));
const deleteButton = Button('Delete');
const fullScreenView = Pane({ id: 'full-screen-view' });
const associatedList = MultiColumnList({ id: 'associated-actionProfiles-list' });
const overrideProtectedSectionAccordoin = Accordion({ id: 'override-protected-section' });
const cannotDeleteModal = Modal({ title: 'Cannot delete field mapping profile' });

const itemDetailsViews = {
  administrativeData: adminDataSection,
  itemData: detailsSection.find(Section({ id: 'view-item-data' })),
  enumerationData: detailsSection.find(Section({ id: 'view-enumeration-data' })),
  itemCondition: detailsSection.find(Section({ id: 'view-item-condition' })),
  itemNotes: detailsSection.find(Section({ id: 'view-item-notes' })),
  itemLoans: detailsSection.find(Section({ id: 'view-item-loans' })),
  itemLocation: detailsSection.find(Section({ id: 'view-item-location' })),
  itemElectronicAccess: detailsSection.find(Section({ id: 'view-item-electronic-access' })),
};
const holdingDetailsViews = {
  administrativeData: adminDataSection,
  holdingsLOcation: detailsSection.find(Section({ id: 'view-holdings-location' })),
  holdingsDetails: detailsSection.find(Section({ id: 'view-holdings-details' })),
  holdingsNotes: detailsSection.find(Section({ id: 'view-holdings-notes' })),
  holdingsElectronicAccess: detailsSection.find(Section({ id: 'view-holdings-electronic-access' })),
  holdingsReceivingHistory: detailsSection.find(Section({ id: 'view-holdings-receiving-history' })),
};

const invoiceDetailsViews = {
  invoiceInformation: detailsSection.find(Section({ id: 'view-invoice-information' })),
  invoiceAdjustments: detailsSection.find(Section({ id: 'view-invoice-adjustments' })),
  vendorInformation: detailsSection.find(Section({ id: 'view-vendor-information' })),
  extendedInformation: detailsSection.find(Section({ id: 'view-extended-information' })),
  invoiceLineInformation: detailsSection.find(Section({ id: 'view-invoice-line-information' })),
  invoiceLIneFundDistribution: detailsSection.find(
    Section({ id: 'view-invoice-line-fund-distribution' }),
  ),
  invoiceLineAdjustments: detailsSection.find(Section({ id: 'view-invoice-line-adjustments' })),
};

const orderDetailsViews = {
  orderInformation: detailsSection.find(Section({ id: 'view-order-information' })),
  orderLineInformation: detailsSection.find(Section({ id: 'view-order-line-information' })),
  // order line info sub sections
  itemDetails: detailsSection.find(Section({ id: 'view-item-details' })),
  poLineDetails: detailsSection.find(Section({ id: 'view-po-line-details' })),
  vendorDetails: detailsSection.find(Section({ id: 'view-vendor' })),
  costDetails: detailsSection.find(Section({ id: 'view-cost-details' })),
  fundDistributionDetails: detailsSection.find(Section({ id: 'view-fund-distribution' })),
  orderLocationDetails: detailsSection.find(Section({ id: 'view-order-location' })),
  pResourceDetails: detailsSection.find(Section({ id: 'view-physical-resource-details' })),
  eResourceDetails: detailsSection.find(Section({ id: 'view-e-resources-details' })),
};

const closeViewMode = (profileName) => {
  cy.do(
    Pane({ title: profileName })
      .find(Button({ icon: 'times' }))
      .click(),
  );
};

const checkUpdatesSectionOfMappingProfile = () => {
  cy.expect(
    Accordion({ id: 'view-field-mappings-for-marc-updates' })
      .find(HTML(including('-')))
      .exists(),
  );
};

const checkOverrideSectionOfMappingProfile = (field, status) => {
  cy.do(
    MultiColumnListCell({ content: field }).perform((element) => {
      const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

      cy.expect(
        fullScreenView
          .find(Accordion({ id: 'override-protected-section' }))
          .find(MultiColumnListRow({ indexRow: rowNumber }))
          .find(Checkbox())
          .has({ disabled: status }),
      );
    }),
  );
};

export default {
  orderDetailsViews,
  checkUpdatesSectionOfMappingProfile,
  checkOverrideSectionOfMappingProfile,
  closeViewMode,
  waitLoading() {
    cy.expect(mappingProfileView.exists());
  },
  verifyFormView({ type } = {}) {
    cy.expect([summarySection.exists(), actionProfilesSection.exists()]);

    if (type === 'ITEM') {
      Object.values(itemDetailsViews).forEach((view) => cy.expect(view.exists()));
    }

    if (type === 'HOLDINGS') {
      Object.values(holdingDetailsViews).forEach((view) => cy.expect(view.exists()));
    }

    if (type === 'INVOICE') {
      Object.values(invoiceDetailsViews).forEach((view) => cy.expect(view.exists()));
    }
  },
  verifyAccordionByNameExpanded(accordionName, status = true) {
    cy.expect(Accordion(accordionName).has({ open: status }));
  },
  checkFieldsConditions({ fields, section } = {}) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(section.find(KeyValue(label)).has(conditions));
    });
  },
  verifyLinkedActionProfile: (profileName) => {
    cy.expect(
      Accordion('Associated action profiles')
        .find(associatedList)
        .find(MultiColumnListCell({ content: profileName }))
        .exists(),
    );
  },
  checkPhysicalResourceDetailsFieldsConditions(fields = []) {
    this.checkFieldsConditions({ fields, section: orderDetailsViews.pResourceDetails });
  },
  checkElectronicResourceDetailsFieldsConditions(fields = []) {
    this.checkFieldsConditions({ fields, section: orderDetailsViews.eResourceDetails });
  },
  collapseAll() {
    cy.do(Button('Collapse all').click());
    cy.wrap(['Order information', 'Order line information']).each((accordion) => {
      cy.expect(Button(accordion).has({ ariaExpanded: 'false' }));
    });
  },
  expandAll() {
    cy.do(Button('Expand all').click());
    cy.wrap(['Order information', 'Order line information']).each((accordion) => {
      cy.expect(Button(accordion).has({ ariaExpanded: 'true' }));
    });
  },
  clickX() {
    cy.do(Button({ icon: 'times' }).click());
    cy.wait(1000);
  },
  checkSummaryFieldsConditions(fields = []) {
    this.checkFieldsConditions({ fields, section: summarySection });
  },
  checkOrderFieldsConditions(fields = []) {
    this.checkFieldsConditions({ fields, section: orderDetailsViews.orderInformation });
  },
  checkOrderLineFieldsConditions(fields = []) {
    this.checkFieldsConditions({ fields, section: orderDetailsViews.orderLineInformation });
  },
  checkAdminDataFieldsConditions(fields = []) {
    this.checkFieldsConditions({ fields, section: adminDataSection });
  },
  checkElectronicAccessFieldsConditions(fields = []) {
    this.checkFieldsConditions({
      fields,
      section: detailsSection.find(
        Section({ id: matching('view-(?:holdings|item)-electronic-access') }),
      ),
    });
  },
  expandActionsDropdown() {
    cy.do(actionsButton.click());
  },
  clickEditButton() {
    this.expandActionsDropdown();
    cy.do(Button('Edit').click());

    FieldMappingProfileEditForm.waitLoading();
    FieldMappingProfileEditForm.verifyFormView();

    return FieldMappingProfileEditForm;
  },
  clickTagsAccordion() {
    cy.do([
      Button({ id: 'accordion-toggle-button-tag-accordion' }).click(),
      instancesTagsSection.find(TextField()).exists,
    ]);
  },
  clickDuplicateButton() {
    this.expandActionsDropdown();
    cy.do(Button('Duplicate').click());

    FieldMappingProfileEditForm.waitLoading();
    FieldMappingProfileEditForm.verifyFormView();

    return FieldMappingProfileEditForm;
  },
  clickCloseButton() {
    cy.do(mappingProfileView.find(Button({ icon: 'times' })).click());
    cy.expect(mappingProfileView.absent());
  },

  checkCreatedMappingProfile: (
    profileName,
    firstField,
    secondField,
    firstFieldStatus = true,
    secondFieldStatus = true,
  ) => {
    checkUpdatesSectionOfMappingProfile();
    cy.do(overrideProtectedSectionAccordoin.clickHeader());
    checkOverrideSectionOfMappingProfile(firstField, firstFieldStatus);
    checkOverrideSectionOfMappingProfile(secondField, secondFieldStatus);
    closeViewMode(profileName);
  },

  checkOverrideProtectedSection: (profileName) => {
    cy.do(overrideProtectedSectionAccordoin.clickHeader());
    cy.expect(overrideProtectedSectionAccordoin.find(HTML({ text: matching(/[-]|\d*/) })).exists());
    closeViewMode(profileName);
  },

  edit: () => {
    cy.expect(fullScreenView.exists());
    cy.do([actionsButton.click(), Button('Edit').click()]);
  },

  delete: (name) => {
    cy.do([
      Layer({ ariaLabel: 'Mapping profile details' }).find(actionsButton).click(),
      deleteButton.click(),
      Modal(including(name)).find(deleteButton).click(),
    ]);
  },

  duplicate: () => {
    cy.do([
      Layer({ ariaLabel: 'Mapping profile details' }).find(actionsButton).click(),
      Button('Duplicate').click(),
    ]);
    cy.expect(Pane({ title: 'New field mapping profile' }).exists());
    cy.wait(1500);
  },

  addFieldForUpdates: () => {
    cy.do(
      Accordion({ id: 'edit-field-mappings-for-marc-updates' }).find(Button('Add field')).click(),
    );
  },

  openAssociatedActionProfile: () => {
    cy.do(
      associatedList
        .find(Link({ href: including('/settings/data-import/action-profiles/view') }))
        .perform((elem) => {
          const linkForVisit = elem.getAttribute('href');
          cy.visit(linkForVisit);
        }),
    );
  },
  closeCannotDeleteModal: () => cy.do(cannotDeleteModal.find(Button('Close')).click()),

  checkCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },

  verifyProfileName: (profileName) => cy.expect(PaneHeader(profileName).exists()),
  verifyValueBySection: (sectionName, value) => cy.expect(KeyValue(sectionName).has({ value: `"${value}"` })),
  verifyValueByAccordionAndSection: (accordion, sectionName, value) => {
    cy.expect(Accordion(accordion).find(KeyValue(sectionName)).has({ value }));
  },
  verifyInstanceStatusTerm: (status) => cy.expect(KeyValue('Instance status term').has({ value: status })),
  verifyActionMenuAbsent: () => cy.expect(Layer({ ariaLabel: 'Mapping profile details' }).find(actionsButton).absent()),
  verifyMappingProfileOpened: () => {
    cy.wait(500);
    cy.expect(Layer({ ariaLabel: 'Mapping profile details' }).exists());
  },
  verifyVendorName: (vendorName) => cy.expect(KeyValue('Vendor name').has({ value: vendorName })),
  verifyCurrency: (value) => cy.expect(KeyValue('Currency').has({ value })),
  verifyDefaultPurchaseOrderLinesLimit: (value) => cy.expect(KeyValue('Purchase order lines limit setting').has({ value })),
  verifyPaymentStatus: (value) => cy.expect(KeyValue('Payment status').has({ value })),
  verifyMappingProfileTitleName: (profileName) => cy.get('#full-screen-view-content h2').should('have.text', profileName),
  verifyCannotDeleteModalOpened: () => cy.expect(cannotDeleteModal.exists()),
  verifyEnabledIndicatorSetToTrueViaApi: (profileId) => {
    cy.okapiRequest({
      path: `data-import-profiles/mappingProfiles/${profileId}`,
      searchParams: {
        limit: 1000,
      },
    }).then((responce) => {
      const expectedValues = {
        enabled: 'true',
        name: 'batchGroupId',
        path: 'invoice.batchGroupId',
        subfields: [],
        value: '"FOLIO"',
      };

      const existingValues = {
        enabled: responce.body.mappingDetails.mappingFields[9].enabled,
        name: responce.body.mappingDetails.mappingFields[9].name,
        path: responce.body.mappingDetails.mappingFields[9].path,
        subfields: responce.body.mappingDetails.mappingFields[9].subfields,
        value: responce.body.mappingDetails.mappingFields[9].value,
      };

      expect(existingValues).to.eql(expectedValues);
    });
  },

  verifyDiscount: (discount) => {
    cy.expect(KeyValue('Discount').has({ value: discount }));
  },

  verifyFundDistributionValue: (val) => {
    cy.expect(
      Accordion('Fund distribution')
        .find(MultiColumnListCell({ content: val }))
        .exists(),
    );
  },

  verifyLocationFieldValue: (rowIndex, columnName, value) => {
    cy.expect(
      Accordion('Location')
        .find(MultiColumnListCell({ row: rowIndex, column: columnName }))
        .has({ content: value }),
    );
  },
};
