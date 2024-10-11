import { Button, TextField, Select } from '../../../../interactors';
import { randomFourDigitNumber } from '../../utils/stringTools';

const saveButton = Button('Save & close');
const nameField = TextField({ id: 'edit-license-name' });
const statusSelect = Select({ id: 'edit-license-status' });
const typeSelect = Select({ id: 'edit-license-type' });

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
};
