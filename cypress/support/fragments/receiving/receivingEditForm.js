import {
  Button,
  Section,
  TextField,
  MultiSelect,
  MultiSelectOption,
  including,
  ValueChipRoot,
  not,
  matching,
} from '../../../../interactors';
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
  acquisitionUnits: itemDetailsSection.find(MultiSelect({ id: 'title-acq-units' })),
};

const lineDetailsFields = {
  poLineNumber: lineDetailsSection.find(TextField({ name: 'poLine.poLineNumber', disabled: true })),
};

const cancelButton = receivingEditForm.find(Button('Cancel'));
const saveAndCloseButton = receivingEditForm.find(Button('Save & close'));
const acqUnitsInputSelector = '#title-acq-units input';
const acqUnitsRemoveButton = itemDetailsFields.acquisitionUnits.find(
  ValueChipRoot().find(Button({ icon: 'times' })),
);
const acqUnitsToggleButton = itemDetailsFields.acquisitionUnits.find(
  Button({ className: including('multiSelectToggleButton') }),
);

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
  selectAcquisitionUnit(acquisitionUnitName) {
    cy.do(itemDetailsFields.acquisitionUnits.open());
    cy.do(itemDetailsFields.acquisitionUnits.fillIn(acquisitionUnitName));
    cy.do(MultiSelectOption(acquisitionUnitName).click());
  },
  removeAcquisitionUnit(acquisitionUnitName) {
    cy.do(itemDetailsFields.acquisitionUnits.find(Button({ icon: 'times' })).click());
    cy.wait(1000);
    cy.expect(
      itemDetailsFields.acquisitionUnits.has({ selected: not(including(acquisitionUnitName)) }),
    );
  },
  verifyAcquisitionUnitDisplayed(acquisitionUnitName, shouldExist = true) {
    if (shouldExist) {
      cy.expect(
        itemDetailsFields.acquisitionUnits.has({ selected: including(acquisitionUnitName) }),
      );
    } else {
      cy.expect(itemDetailsFields.acquisitionUnits.has({ selected: [] }));
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
  openAcquisitionUnitsDropdown() {
    cy.do(itemDetailsFields.acquisitionUnits.open());
  },
  verifyAcquisitionUnitsInDropdown(acquisitionUnits = []) {
    this.openAcquisitionUnitsDropdown();
    acquisitionUnits.forEach((auName) => {
      cy.expect(MultiSelectOption(auName).exists());
    });
  },
  verifySaveButtonEnabled(isEnabled = true) {
    cy.expect(saveAndCloseButton.has({ disabled: !isEnabled }));
  },
  verifyAcquisitionUnitsDropdownDisabled() {
    cy.get(acqUnitsInputSelector).should('be.disabled');
  },
  tryRemoveAcquisitionUnit(acquisitionUnitName) {
    cy.expect(acqUnitsRemoveButton.has({ disabled: true }));
    cy.expect(itemDetailsFields.acquisitionUnits.has({ selected: including(acquisitionUnitName) }));
  },
  tryExpandAcquisitionUnitsDropdown() {
    cy.expect(acqUnitsToggleButton.has({ disabled: true }));
    cy.expect(itemDetailsFields.acquisitionUnits.has({ open: false }));
  },
};
