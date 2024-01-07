import { Button, KeyValue, Section, matching } from '../../../../../../interactors';
import FieldMappingProfileEditForm from './fieldMappingProfileEditForm';

const mappingProfileView = Section({ id: 'full-screen-view' });

const summarySection = mappingProfileView.find(Section({ id: 'view-summary' }));
const detailsSection = mappingProfileView.find(Section({ id: 'view-mapping-profile-details' }));
const adminDataSection = detailsSection.find(Section({ id: 'view-administrative-data' }));
const actionProfilesSection = mappingProfileView.find(
  Section({ id: 'view-mappingProfileFormAssociatedActionProfileAccordion' }),
);

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

const actionsButton = mappingProfileView.find(Button('Actions'));

export default {
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
  checkFieldsConditions({ fields, section } = {}) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(section.find(KeyValue(label)).has(conditions));
    });
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
  checkPhysicalResourceDetailsFieldsConditions(fields = []) {
    this.checkFieldsConditions({ fields, section: orderDetailsViews.pResourceDetails });
  },
  checkElectronicResourceDetailsFieldsConditions(fields = []) {
    this.checkFieldsConditions({ fields, section: orderDetailsViews.eResourceDetails });
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
};
