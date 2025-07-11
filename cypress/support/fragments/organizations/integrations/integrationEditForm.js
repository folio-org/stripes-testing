import moment from 'moment';

import { Button, Checkbox, Section, Select, TextField } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import IntegrationStates from './integrationStates';

const integrationViewForm = Section({ id: 'integration-form' });

const schedulingSection = Section({ id: 'scheduling' });

const saveButton = Button('Save & close');
const cancelButton = Button('Cancel');

const prefix = 'exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule';
const schedulingFields = {
  enableScheduledExport: schedulingSection.find(
    Checkbox({
      name: `${prefix}.enableScheduledExport`,
    }),
  ),
  scheduleFrequency: schedulingSection.find(TextField('Schedule frequency*')),
  schedulePeriod: schedulingSection.find(
    Select({
      name: `${prefix}.scheduleParameters.schedulePeriod`,
    }),
  ),
  schedulingDate: schedulingSection.find(
    TextField({
      name: `${prefix}.scheduleParameters.schedulingDate`,
    }),
  ),
  schedulingTime: schedulingSection.find(TextField('Time*')),
};

const buttons = {
  Cancel: cancelButton,
  'Save & close': saveButton,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(integrationViewForm.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  setScheduleOptions({ frequency = '1', period = 'Daily', time } = {}) {
    // time should be in UTC
    cy.do([
      schedulingFields.enableScheduledExport.click(),
      schedulingFields.scheduleFrequency.fillIn(frequency),
      schedulingFields.schedulePeriod.choose(period),
      schedulingFields.schedulingDate.fillIn(`${moment.utc().format('MM/DD/YYYY')}`),
      schedulingFields.schedulingTime.fillIn(`${time}`),
    ]);
  },
  clickSaveButton({ integrationSaved = true, timeOut = 2000 } = {}) {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());

    if (integrationSaved) {
      InteractorsTools.checkCalloutMessage(IntegrationStates.integrationSaved);
    }
    // wait for changes to be applied
    cy.wait(timeOut);
  },

  selectSchedulingDay(day) {
    cy.do(
      schedulingSection
        .find(
          Checkbox({
            name: `exportTypeSpecificParameters.vendorEdiOrdersExportConfig.ediSchedule.scheduleParameters.weekDays[${day}]`,
          }),
        )
        .click(),
    );
  },
};
