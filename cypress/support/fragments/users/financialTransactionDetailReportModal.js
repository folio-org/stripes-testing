import DateTools from '../../utils/dateTools';
import {
  Button,
  Modal,
  TextField,
  Select,
  including,
  MultiSelect,
  HTML,
  Callout,
  calloutTypes,
} from '../../../../interactors';

const financialReport = Modal({ id: 'financial-transactions-report-modal' });
const startDateTextfield = TextField({ name: 'startDate' });
const endDateTextfield = TextField({ name: 'endDate' });
const firstDayOfMonth = DateTools.getFormattedDate(
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
  'MM/DD/YYYY',
);
const currentDayOfMonth = DateTools.getFormattedDate(
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) },
  'MM/DD/YYYY',
);
const feeFineOwnerSelect = Select({ content: including('Select fee/fine owner') });

const startDateFieldCalendarIconLocator = './/div[./*[@name="startDate"]]//*[@icon="calendar"]';
const endDateFieldCalendarIconLocator = './/div[./*[@name="endDate"]]//*[@icon="calendar"]';
const calloutSuccessMessage = 'Export in progress';
const calloutErrorMessage = 'Something went wrong.';
const calloutNoItemsFoundMessage = 'No items found.';

const financialTransactionDetailReportHeader =
  '"Fee/fine owner","Fee/fine type","Fee/fine billed amount","Fee/fine billed date/time","Fee/fine created at","Fee/fine source","Fee/fine details","Action","Action amount","Action date/time","Action created at","Action source","Action status","Action additional staff information","Action additional patron information","Payment method","Payment transaction information","Waive reason","Refund reason","Transfer account","Patron name","Patron barcode","Patron group","Patron email address","Instance","Contributors","Item barcode","Call number","Effective location","Loan date/time","Due date/time","Return date/time","Loan policy","Overdue policy","Lost item policy","Loan details"';

export default {
  financialTransactionDetailReportHeader,
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

  stubResponse500Error() {
    cy.intercept('POST', '/feefine-reports/financial-transactions-detail', {
      statusCode: 500,
    });
  },

  verifyCalloutMessage() {
    cy.expect(Callout({ type: calloutTypes.success }).is({ textContent: calloutSuccessMessage }));
  },
  verifyCalloutErrorMessage() {
    cy.expect(Callout({ type: calloutTypes.error }).is({ textContent: calloutErrorMessage }));
  },
  verifyCalloutNoItemsFoundMessage() {
    cy.expect(
      Callout({ type: calloutTypes.error }).is({ textContent: calloutNoItemsFoundMessage }),
    );
  },

  fillInServicePoints(servicePoints) {
    cy.do([
      financialReport
        .find(MultiSelect({ label: 'Associated service points' }))
        .choose(servicePoints),
    ]);
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
    cy.do(
      financialReport
        .find(Button({ id: 'financial-transactions-report-modal-close-button' }))
        .click(),
    );
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
    cy.expect(
      financialReport
        .find(HTML(including('"Start date" is required if "End date" entered')))
        .exists(),
    );
  },

  verifyEndDateMustBeGreaterThanOrEqualToStartDateErrorMessage() {
    cy.expect(
      financialReport
        .find(HTML(including('"End date" must be greater than or equal to "Start date"')))
        .exists(),
    );
  },

  verifyFeeFineOwnerIsRequiredErrorMessage() {
    cy.expect(financialReport.find(HTML(including('"Fee/fine owner" is required'))).exists());
  },

  verifyFileExists(fileName) {
    cy.readFile(`cypress/downloads/${fileName}`);
  },

  checkDownloadedFile(
    fileName,
    action,
    actionAmount,
    columnNumber,
    data,
    rowNumber = 1,
    header = financialTransactionDetailReportHeader,
  ) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      expect(fileRows[0].trim()).to.equal(header);

      const actualData = fileRows[rowNumber].trim().split('","');
      expect(actualData[7]).to.equal(action);
      expect(Number(actualData[8])).to.equal(Number(actionAmount));
      expect(actualData[columnNumber]).to.equal(data);
    });
  },

  checkCellInCsvFileContainsValue(fileName, rowNumber = 1, columnNumber, value) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');

      const actualData = fileRows[rowNumber].trim().split('","');
      expect(actualData[columnNumber]).to.contains(value);
    });
  },

  deleteDownloadedFile(fileName) {
    const filePath = `cypress\\downloads\\${fileName}`;
    cy.exec(`del "${filePath}"`, { failOnNonZeroExit: false });
  },
};
