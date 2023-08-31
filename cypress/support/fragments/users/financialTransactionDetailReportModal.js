import DateTools from '../../utils/dateTools';
import { Button, Modal, TextField, Select, including, MultiSelect, HTML } from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const financialReport = Modal({ id: 'financial-transactions-report-modal' });
const startDateTextfield = TextField({ name: 'startDate' });
const endDateTextfield = TextField({ name: 'endDate' });
const firstDayOfMonth = DateTools.getFormattedDate({ date: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }, 'MM/DD/YYYY');
const currentDayOfMonth = DateTools.getFormattedDate({ date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) }, 'MM/DD/YYYY');
const feeFineOwnerSelect = Select({ content: including('Select fee/fine owner') });
const calloutMessage = 'Export in progress';
const startDateFieldCalendarIconLocator = './/div[./*[@name="startDate"]]//*[@icon="calendar"]';
const endDateFieldCalendarIconLocator = './/div[./*[@name="endDate"]]//*[@icon="calendar"]';

export default {
  fillInRequiredFields({ startDate, ownerName }) {
    if (startDate) {
      cy.do(financialReport.find(startDateTextfield).fillIn(startDate));
    } else {
      cy.do(financialReport.find(startDateTextfield).fillIn(firstDayOfMonth));
      cy.expect(financialReport.find(feeFineOwnerSelect).exists());
      cy.do(financialReport.find(feeFineOwnerSelect).choose(ownerName));
    }
  },

  fillInStartDate(startDate) {
    if (startDate) cy.do(financialReport.find(startDateTextfield).fillIn(startDate));
    else cy.do(financialReport.find(startDateTextfield).fillIn(currentDayOfMonth));
  },

  fillInEndDate(endDate) {
    if (endDate) cy.do(financialReport.find(endDateTextfield).fillIn(endDate));
    else cy.do(financialReport.find(endDateTextfield).fillIn(currentDayOfMonth));
  },

  verifyStartDateFieldCalendarIcon() {
    cy.xpath(startDateFieldCalendarIconLocator).should('be.visible');
  },

  verifyEndDateFieldCalendarIcon() {
    cy.xpath(endDateFieldCalendarIconLocator).should('be.visible');
  },

  verifyCalendarIsShown() {
    cy.get('[id^="datepicker-calendar-container"]').should('be.visible');
  },

  openStartDateFieldCalendar() {
    cy.xpath(startDateFieldCalendarIconLocator).click();
  },

  openEndDateFieldCalendar() {
    cy.xpath(endDateFieldCalendarIconLocator).click();
  },

  verifySaveButtonIsEnabled() {
    cy.do(financialReport.find(Button(including('Save'))).has({ disabled: false }));
  },

  verifySaveButtonIsDisabled() {
    cy.do(financialReport.find(Button(including('Save'))).has({ disabled: true }));
  },

  verifyCancelButtonIsEnabled() {
    cy.do(financialReport.find(Button(including('Cancel'))).has({ disabled: false }));
  },

  verifyStartDateFieldIsEmpty() {
    cy.do(financialReport.find(startDateTextfield).has({ value: '' }));
  },

  verifyEndDateFieldIsEmpty() {
    cy.do(financialReport.find(endDateTextfield).has({ value: '' }));
  },

  verifyFeeFineOwnerSelect() {
    cy.expect(financialReport.find(feeFineOwnerSelect).exists());
  },

  verifyAssociatedServicePointsMultiSelect() {
    cy.expect(financialReport.find(MultiSelect({ label: 'Associated service points' })).exists());
  },

  save() {
    cy.do(financialReport.find(Button(including('Save'))).click());
  },

  verifyCalloutMessage() {
    InteractorsTools.checkCalloutMessage(calloutMessage);
  },

  fillInServicePoints(servicePoints) {
    cy.do([financialReport.find(MultiSelect({ label: 'Associated service points' })).choose(servicePoints)]);
  },

  verifyFinancialReportModalIsShown() {
    cy.expect(financialReport.exists());
  },

  verifyFinancialReportModalIsNotShown() {
    cy.expect(financialReport.absent());
  },

  closeFinancialReportModalByEscButton() {
    cy.get('#financial-transactions-report-modal').type('{esc}');
  },

  closeFinancialReportModalByXButton() {
    cy.do(financialReport.find(Button({ id: 'financial-transactions-report-modal-close-button' })).click());
  },

  closeFinancialReportModalByCancelButton() {
    cy.do(financialReport.find(Button(including('Cancel'))).click());
  },

  clickEndDateField() {
    cy.do(financialReport.find(endDateTextfield).click());
  },

  activateFeeFineOwnerSelect() {
    cy.do(financialReport.find(feeFineOwnerSelect).focus());
    cy.do(financialReport.click());
  },

  verifyStartDateIsRequiredErrorMessage() {
    cy.expect(financialReport.find(HTML(including('"Start date" is required'))).exists());
  },

  verifyStartDateIsRequiredIfEndDateEnteredErrorMessage() {
    cy.expect(financialReport.find(HTML(including('"Start date" is required if "End date" entered'))).exists());
  },

  verifyEndDateMustBeGreaterThanOrEqualToStartDateErrorMessage() {
    cy.expect(financialReport.find(HTML(including('"End date" must be greater than or equal to "Start date"'))).exists());
  },

  verifyFeeFineOwnerIsRequiredErrorMessage() {
    cy.expect(financialReport.find(HTML(including('"Fee/fine owner" is required'))).exists());
  }
};
