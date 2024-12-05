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
} from '../../../../../interactors';

const actionsButton = Button('Actions');
const deleteButton = Button('Delete');
const fullScreenView = Pane({ id: 'full-screen-view' });
const associatedList = MultiColumnList({ id: 'associated-actionProfiles-list' });
const overrideProtectedSectionAccordoin = Accordion({ id: 'override-protected-section' });
const cannotDeleteModal = Modal({ title: 'Cannot delete field mapping profile' });

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
  checkUpdatesSectionOfMappingProfile,
  checkOverrideSectionOfMappingProfile,
  closeViewMode,

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
    cy.do([fullScreenView.find(actionsButton).click(), Button('Edit').click()]);
  },

  delete: (name) => {
    cy.do([
      fullScreenView.find(actionsButton).click(),
      deleteButton.click(),
      Modal(including(name)).find(deleteButton).click(),
    ]);
  },

  duplicate: () => {
    cy.do([fullScreenView.find(actionsButton).click(), Button('Duplicate').click()]);
    cy.expect(Pane({ title: 'New field mapping profile' }).exists());
    cy.wait(1500);
  },

  addFieldForUpdates: () => {
    cy.do(
      Accordion({ id: 'edit-field-mappings-for-marc-updates' }).find(Button('Add field')).click(),
    );
  },

  verifyLinkedActionProfile: (profileName) => {
    cy.expect(
      Accordion('Associated action profiles')
        .find(associatedList)
        .find(MultiColumnListCell({ content: profileName }))
        .exists(),
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
  verifyActionMenuAbsent: () => cy.expect(fullScreenView.find(actionsButton).absent()),
  verifyMappingProfileOpened: () => cy.expect(fullScreenView.exists()),
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
