import { including } from '@interactors/html';
import {
  Accordion,
  PaneHeader,
  MultiColumnListCell,
  KeyValue,
  Button,
  TextField,
  TextArea,
  Checkbox,
  HTML,
  MetaSection,
} from '../../../../../interactors';

const actionsButton = Button('Actions');
const editButton = Button('Edit');
const duplicateButton = Button('Duplicate');
const deleteButton = Button('Delete');
const nameTextfield = TextField('Name*');
const descriptionTextarea = TextArea('Description');
const saveAndCloseButton = Button('Save & close');
const cancelButton = Button('Cancel');

export default {
  clickProfileNameFromTheList(name) {
    cy.wait(2000);
    // Scroll in case the list of results is long
    const scrollableSelector = '#search-results-list [class^=mclScrollable]';

    cy.get(scrollableSelector).then(($element) => {
      // Check if the element is scrollable
      const hasVerticalScrollbar = $element.get(0).scrollHeight > $element.get(0).clientHeight;

      if (hasVerticalScrollbar) {
        cy.get(scrollableSelector).scrollTo('bottom');
      }
    });
    cy.do(MultiColumnListCell(including(name)).click());
  },

  waitLoading(name) {
    cy.expect(PaneHeader(name).exists());
  },

  verifyProfileDetails(profileDetails) {
    cy.expect([
      KeyValue('Name').has({ value: profileDetails.name }),
      KeyValue('FOLIO record type').has({ value: profileDetails.recordType }),
      KeyValue('Output format').has({ value: profileDetails.outputFormat }),
      KeyValue('Description').has({ value: profileDetails.description }),
      Accordion({ headline: 'Update information' }).has({
        content: including(`Source: ${profileDetails.source}`),
      }),
    ]);
    if (Object.prototype.hasOwnProperty.call(profileDetails, 'fieldsSuppression')) {
      cy.expect(KeyValue('Fields suppression').has({ value: profileDetails.fieldsSuppression }));
    }

    if (Object.prototype.hasOwnProperty.call(profileDetails, 'transformation')) {
      cy.expect(HTML('No transformations found').absent());
    }
  },

  verifyElements() {
    cy.expect([
      Accordion({ label: 'Summary', open: true }).exists(),
      Accordion({ label: 'Transformations', open: true }).exists(),
      Button('Collapse all').has({ disabled: false }),
      Button({ icon: 'times' }).has({ disabled: false }),
      actionsButton.has({ disabled: false }),
      Button({ ariaLabel: 'Cancel' }).has({ disabled: false }),
    ]);
  },

  verifyOnlyDuplicateOptionAvailable() {
    this.openActions();
    cy.expect([
      editButton.absent(),
      duplicateButton.has({ disabled: false }),
      deleteButton.absent(),
    ]);
  },

  verifyActionOptions() {
    this.openActions();
    cy.expect([
      editButton.has({ disabled: false }),
      duplicateButton.has({ disabled: false }),
      deleteButton.has({ disabled: false }),
    ]);
  },

  editFieldMappingProfile(newName, newDescription) {
    this.clickEditButton();
    // Need to wait for page to reload
    cy.wait(2000);
    cy.do([
      nameTextfield.clear(),
      nameTextfield.fillIn(newName),
      descriptionTextarea.fillIn(newDescription),
    ]);
  },

  verifyMetadataSectionExists() {
    cy.expect(
      Accordion('Summary')
        .find(MetaSection({ open: false }))
        .exists(),
    );
  },

  duplicateFieldMappingProfile() {
    cy.do([duplicateButton.click(), saveAndCloseButton.click()]);
  },

  clickEditTransformations() {
    cy.do(Accordion('Transformations').find(Button('Edit transformations')).click());
  },

  checkRecordType(recordType) {
    cy.do(Checkbox(recordType).click());
  },

  openActions() {
    cy.do(actionsButton.click());
  },

  clickEditButton() {
    cy.do(editButton.click());
    cy.wait(2000);
  },

  clickDuplicateButton() {
    cy.do(duplicateButton.click());
  },

  clickCancelButton() {
    cy.do(cancelButton.click());
  },

  verifyActionsButtonAbsent() {
    cy.expect(actionsButton.absent());
  },

  clickXButton() {
    cy.do(Button({ icon: 'times' }).click());
  },
};
