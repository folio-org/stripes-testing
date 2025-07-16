import { Button, Section, TextField, matching } from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import ReceivingStates from './receivingStates';

const receivingEditForm = Section({ id: 'pane-title-form' });
const itemDetailsSection = receivingEditForm.find(Section({ id: 'itemDetails' }));
const lineDetailsSection = receivingEditForm.find(Section({ id: 'lineDetails' }));

const itemDetailsFields = {
  title: itemDetailsSection.find(TextField({ name: 'title', disabled: true })),
  publisher: itemDetailsSection.find(TextField({ name: 'publisher' })),
  publishedDate: itemDetailsSection.find(TextField({ name: 'publishedDate' })),
  edition: itemDetailsSection.find(TextField({ name: 'edition' })),
};

const lineDetailsFields = {
  poLineNumber: lineDetailsSection.find(TextField({ name: 'poLine.poLineNumber', disabled: true })),
};

const cancelButton = receivingEditForm.find(Button('Cancel'));
const saveAndCloseButton = receivingEditForm.find(Button('Save & close'));

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(receivingEditForm.exists());
  },
  checkReceivingFormContent({ itemDetails, lineDetails }) {
    if (itemDetails) {
      this.checkItemDetailsFields(itemDetails);
    }

    if (lineDetails) {
      this.checLineDetailsFields(lineDetails);
    }
  },
  checkItemDetailsFields({ title }) {
    if (title) {
      cy.expect(itemDetailsFields.title.has({ value: title }));
    }
  },
  checLineDetailsFields({ poLineNumber }) {
    if (poLineNumber) {
      cy.expect(lineDetailsFields.poLineNumber.has({ value: poLineNumber }));
    }
  },
  fillReceivingsFields({ itemDetails, lineDetails }) {
    if (itemDetails) {
      this.fillItemDetailsFields(itemDetails);
    }

    if (lineDetails) {
      this.fillLineDetailsFields(lineDetails);
    }
  },
  fillItemDetailsFields({ publisher, publishedDate, edition }) {
    if (publisher) {
      cy.do(itemDetailsFields.publisher.fillIn(publisher));
    }
    if (publishedDate) {
      cy.do(itemDetailsFields.publishedDate.fillIn(publishedDate));
    }
    if (edition) {
      cy.do(itemDetailsFields.edition.fillIn(edition));
    }
  },
  clickCancelButton() {
    cy.expect(cancelButton.has({ disabled: false }));
    cy.do(cancelButton.click());
  },
  clickSaveButton({ itemSaved = true } = {}) {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.do(saveAndCloseButton.click());

    if (itemSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(ReceivingStates.itemSavedSuccessfully)),
      );
    }
  },
};
