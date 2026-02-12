import {
  Button,
  TextField,
  Select,
  MultiColumnListCell,
  including,
  Section,
} from '../../../../interactors';
import { randomFourDigitNumber } from '../../utils/stringTools';

const saveButton = Button('Save & close');
const nameField = TextField({ id: 'edit-license-name' });
const statusSelect = Select({ id: 'edit-license-status' });
const typeSelect = Select({ id: 'edit-license-type' });
const notesAccordionToggleButton = Button({ id: 'accordion-toggle-button-licenseNotes' });
const notesAccordionSection = Section({ id: 'licenseNotes' });

const defaultLicense = {
  name: `Default License ${randomFourDigitNumber()}`,
  licenseType: 'Local',
  licenseStatus: 'Active',
};

export default {
  defaultLicense,
  fillDefault(license) {
    cy.do([
      statusSelect.choose(license.licenseStatus),
      typeSelect.choose(license.licenseType),
      nameField.fillIn(license.name),
    ]);
  },
  save() {
    cy.do(saveButton.click());
  },
  waitLoading() {
    cy.expect(nameField.exists());
  },

  createViaApi: (license = defaultLicense) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'licenses/licenses',
        body: license,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },

  expandNotesSection() {
    cy.do(notesAccordionToggleButton.click());
  },

  verifyNoteInList(noteTitle) {
    cy.expect(
      notesAccordionSection.find(MultiColumnListCell({ content: including(noteTitle) })).exists(),
    );
  },

  clickNoteInList(noteTitle) {
    cy.do(
      notesAccordionSection.find(MultiColumnListCell({ content: including(noteTitle) })).click(),
    );
  },
};
