import { Button, TextField, Select } from '../../../../interactors';
import DateTools from '../../utils/dateTools';
import getRandomPostfix from '../../utils/stringTools';

const saveButton = Button('Save & close');
const nameField = TextField({ id: 'edit-agreement-name' });
const startDateField = TextField({ id: 'period-start-date-0' });
const renewalPrioritySelect = Select('Renewal priority');
const isPerpetualSelect = Select('Is perpetual');

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

  checkSelectFields() {
    cy.expect(Select('Status*').exists());
    cy.expect(renewalPrioritySelect.exists());
    cy.expect(isPerpetualSelect.exists());
  },

  save() {
    cy.do(saveButton.click());
  },
  waitLoading() {
    cy.expect(nameField.exists());
  },
};
