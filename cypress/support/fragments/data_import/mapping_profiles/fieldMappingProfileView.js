import { HTML, including } from '@interactors/html';
import { matching } from 'bigtest';
import {
  Accordion,
  MultiColumnListRow,
  Button,
  Pane,
  Checkbox,
  MultiColumnListCell,
  Modal,
  MultiColumnList,
  Link,
  Callout,
  KeyValue,
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
const deleteViaApi = (profileName) => {
  // get all mapping profiles
  cy.okapiRequest({
    path: 'data-import-profiles/mappingProfiles',
    searchParams: {
      query: '(cql.allRecords=1) sortby name',
      limit: 1000,
    },
  })
    .then(({ body: { mappingProfiles } }) => {
      // find profile to delete
      const profileToDelete = mappingProfiles.find((profile) => profile.name === profileName);

      // delete profile with its id
      cy.okapiRequest({
        method: 'DELETE',
        path: `data-import-profiles/mappingProfiles/${profileToDelete.id}`,
      });
    })
    .then(({ status }) => {
      if (status === 204) cy.log('###DELETED MAPPING PROFILE###');
    });
};

export default {
  checkUpdatesSectionOfMappingProfile,
  checkOverrideSectionOfMappingProfile,
  closeViewMode,
  deleteViaApi,

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

  checkCalloutMessage: (profileName) => {
    cy.expect(
      Callout({
        textContent: including(
          `The field mapping profile "${profileName}" was successfully updated`,
        ),
      }).exists(),
    );
  },

  checkCreateProfileCalloutMessage: (profileName) => {
    cy.expect(
      Callout({
        textContent: including(
          `The field mapping profile "${profileName}" was successfully created`,
        ),
      }).exists(),
    );
  },

  verifyInstanceStatusTerm: (status) => cy.expect(KeyValue('Instance status term').has({ value: status })),
  verifyActionMenuAbsent: () => cy.expect(fullScreenView.find(actionsButton).absent()),
  verifyMappingProfileOpened: () => cy.expect(fullScreenView.exists()),
  verifyVendorName: (vendorName) => cy.expect(KeyValue('Vendor name').has({ value: vendorName })),
  verifyMappingProfileTitleName: (profileName) => cy.get('#full-screen-view-content h2').should('have.text', profileName),
  verifyCannotDeleteModalOpened: () => cy.expect(cannotDeleteModal.exists()),
  closeCannotDeleteModal: () => cy.do(cannotDeleteModal.find(Button('Close')).click()),
};
