import { Button, KeyValue, Section } from '../../../../../../interactors';
import FieldMappingProfileEditForm from './fieldMappingProfileEditForm';

const mappingProfileView = Section({ id: 'full-screen-view' });

const summarySection = mappingProfileView.find(Section({ id: 'view-summary' }));
const detailsSection = mappingProfileView.find(Section({ id: 'view-mapping-profile-details' }));
const actionProfilesSection = mappingProfileView.find(
  Section({ id: 'view-mappingProfileFormAssociatedActionProfileAccordion' }),
);

const itemDetailsViews = {
  administrativeData: detailsSection.find(Section({ id: 'view-administrative-data' })),
  itemData: detailsSection.find(Section({ id: 'view-item-data' })),
  enumerationData: detailsSection.find(Section({ id: 'view-enumeration-data' })),
  itemCondition: detailsSection.find(Section({ id: 'view-item-condition' })),
  itemNotes: detailsSection.find(Section({ id: 'view-item-notes' })),
  itemLoans: detailsSection.find(Section({ id: 'view-item-loans' })),
  itemLocation: detailsSection.find(Section({ id: 'view-item-location' })),
  itemElectronicAccess: detailsSection.find(Section({ id: 'view-item-electronic-access' })),
};
const holdingDetailsViews = {
  administrativeData: detailsSection.find(Section({ id: 'view-administrative-data' })),
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
