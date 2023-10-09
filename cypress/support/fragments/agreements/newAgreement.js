import { Button, TextField, Select } from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import getRandomPostfix from '../../utils/stringTools';

const saveButton = Button('Save & close');
const nameField = TextField({ id: 'edit-agreement-name' });
const startDateField = TextField({ id: 'period-start-date-0' });

const statusValue = {
  closed: 'Closed',
  draft: 'Draft',
  requested: 'Requested',
  inNegotiation: 'In negotiation',
  active: 'Active',
};

const defaultAgreement = {
  name: `autotest_agreement_${getRandomPostfix()}`,
  status: statusValue.draft,
  startDate: DateTools.getCurrentDate(),
};

const getdefaultAgreement = () => {
  return defaultAgreement;
};

export default {
  defaultAgreement,
  getdefaultAgreement,

  fill(specialAgreement = defaultAgreement) {
    cy.do([
      nameField.fillIn(specialAgreement.name),
      Select('Status*').choose(specialAgreement.status),
      startDateField.fillIn(specialAgreement.startDate),
    ]);
  },

  save() {
    cy.do(saveButton.click());
  },
  waitLoading() {
    cy.expect(nameField.exists());
  },
};
