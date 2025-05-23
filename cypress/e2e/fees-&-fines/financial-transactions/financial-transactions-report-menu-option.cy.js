import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../../support/fragments/topMenu';
import FinancialTransactionDetailReportModal from '../../../support/fragments/users/financialTransactionDetailReportModal';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';

describe('Fees&Fines', () => {
  describe('Financial Transactions Detail Report', () => {
    const ownerData1 = {};
    const ownerData = {};
    const servicePoint1 = ServicePoints.getDefaultServicePointWithPickUpLocation();
    const servicePoint2 = ServicePoints.getDefaultServicePointWithPickUpLocation();

    before('UserOwner is created', () => {
      // the login with admin, visiting the path and the waiter are separated to get the fetch request to get owners
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(servicePoint1);
        ServicePoints.createViaApi(servicePoint2);

        UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
          .then(({ id, owner }) => {
            ownerData1.name = owner;
            ownerData1.id = id;
          })
          .then(() => {
            UsersOwners.addServicePointsViaApi(ownerData1, [servicePoint1, servicePoint2]);
          });

        UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
          .then(({ id, owner }) => {
            ownerData.name = owner;
            ownerData.id = id;
          })
          .then(() => {
            UsersOwners.addServicePointsViaApi(ownerData, [servicePoint1, servicePoint2]);
          });
      });
    });

    beforeEach('visiting Users module', () => {
      cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchResultsPane.waitLoading });
    });

    after('UserOwner is removed', () => {
      UsersOwners.deleteViaApi(ownerData1.id);
      UsersOwners.deleteViaApi(ownerData.id);
      ServicePoints.deleteViaApi(servicePoint1.id);
      ServicePoints.deleteViaApi(servicePoint2.id);
    });

    it(
      'C343305 Check that the "Financial transactions detail report (CSV)" is displayed in "Actions" (vega)',
      { tags: ['criticalPath', 'vega', 'C343305'] },
      () => {
        UsersSearchResultsPane.verifyOptionsInActionsMenu();
      },
    );

    it(
      'C343320 Check that the icon calendar is displayed in the Start date and End date on the "Financial transactions detail report" modal (vega)',
      { tags: ['criticalPath', 'vega', 'C343320'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.verifyStartDateFieldCalendarIcon();
        FinancialTransactionDetailReportModal.verifyEndDateFieldCalendarIcon();
      },
    );

    it(
      'C343321 Check when user click on the icon calendar appears "datepicker" and user can select any date (vega)',
      { tags: ['criticalPath', 'vega', 'C343321'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.openStartDateFieldCalendar();
        FinancialTransactionDetailReportModal.verifyCalendarIsShown();
        FinancialTransactionDetailReportModal.openEndDateFieldCalendar();
        FinancialTransactionDetailReportModal.verifyCalendarIsShown();
      },
    );

    it(
      'C343306 Check that the "Financial transactions detail report" modal is display when selected "Financial transactions detail report (CSV)" (vega)',
      { tags: ['criticalPath', 'vega', 'C343306'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.verifyStartDateFieldIsEmpty();
        FinancialTransactionDetailReportModal.verifyEndDateFieldIsEmpty();
        FinancialTransactionDetailReportModal.verifyFeeFineOwnerSelect();
        FinancialTransactionDetailReportModal.verifyAssociatedServicePointsMultiSelect();
        FinancialTransactionDetailReportModal.verifySaveButtonIsDisabled();
        FinancialTransactionDetailReportModal.verifyCancelButtonIsEnabled();
      },
    );

    it(
      'C343307 Check that the user returns to the "User search result" page when click in the "Cancel" button or "X" button on the "Financial transactions detail report" modal (vega)',
      { tags: ['criticalPath', 'vega', 'C343307'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.verifyFinancialReportModalIsShown();
        FinancialTransactionDetailReportModal.closeFinancialReportModalByCancelButton();
        FinancialTransactionDetailReportModal.verifyFinancialReportModalIsNotShown();
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.verifyFinancialReportModalIsShown();
        FinancialTransactionDetailReportModal.closeFinancialReportModalByXButton();
        FinancialTransactionDetailReportModal.verifyFinancialReportModalIsNotShown();
      },
    );

    it(
      'C343308 Check that the user can not close "Financial transactions detail report" modal when click on the outside the modal (vega)',
      { tags: ['criticalPath', 'vega', 'C343308'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        UsersSearchResultsPane.clickActionsButton();
        FinancialTransactionDetailReportModal.verifyFinancialReportModalIsShown();
      },
    );

    it(
      'C343309 Check that the user can close "Financial transactions detail report" modal when click on the "Esc" button (vega)',
      { tags: ['criticalPath', 'vega', 'C343309'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.verifyFinancialReportModalIsShown();
        FinancialTransactionDetailReportModal.closeFinancialReportModalByEscButton();
        FinancialTransactionDetailReportModal.verifyFinancialReportModalIsNotShown();
      },
    );

    it(
      'C343311 Check that the error message ""Start date" is required" is appears under Start date field (vega)',
      { tags: ['criticalPath', 'vega', 'C343311'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.focusStartDateField();
        FinancialTransactionDetailReportModal.focusEndDateField();
        FinancialTransactionDetailReportModal.verifyStartDateIsRequiredErrorMessage();
      },
    );

    it(
      'C343312 Check that the error message ""Start date" is required if "End date" entered" is appears under Start date field and has red color when End date was selected (vega)',
      { tags: ['criticalPath', 'vega', 'C343312'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.focusStartDateField();
        FinancialTransactionDetailReportModal.fillInEndDate();
        FinancialTransactionDetailReportModal.verifyStartDateIsRequiredIfEndDateEnteredErrorMessage();
      },
    );

    it(
      'C343313 Check that the "End date" must be greater than or equal to "Start date" error message is appears when End date is less than Start date (vega)',
      { tags: ['criticalPath', 'vega', 'C343313'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.fillInStartDate('01/20/2020');
        FinancialTransactionDetailReportModal.fillInEndDate('01/10/2020');
        FinancialTransactionDetailReportModal.verifyEndDateMustBeGreaterThanOrEqualToStartDateErrorMessage();
      },
    );

    it(
      'C343314 Check that the ""Fee/fine owner" is required" error message is appears when user is not selected "Fee/fine owner" (vega)',
      { tags: ['criticalPath', 'vega', 'C343314'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.fillInStartDate();
        FinancialTransactionDetailReportModal.fillInEndDate();
        FinancialTransactionDetailReportModal.verifyFeeFineOwnerSelect();
        FinancialTransactionDetailReportModal.activateFeeFineOwnerSelect();
        FinancialTransactionDetailReportModal.verifyFeeFineOwnerIsRequiredErrorMessage();
      },
    );

    it(
      'C343316 Check that the "Save&close" button has become active after filling in all the required fields with valid data (vega)',
      { tags: ['criticalPath', 'vega', 'C343316'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.fillInRequiredFields({
          startDate: false,
          ownerName: ownerData.name,
        });
        FinancialTransactionDetailReportModal.verifySaveButtonIsEnabled();
      },
    );

    it(
      'C343319 Check that the user can select more than one service points in the "Associated service points" field (vega)',
      { tags: ['criticalPath', 'vega', 'C343319'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.fillInRequiredFields({
          startDate: false,
          ownerName: ownerData.name,
        });
        FinancialTransactionDetailReportModal.fillInEndDate();
        FinancialTransactionDetailReportModal.fillInServicePoints([
          servicePoint1.name,
          servicePoint2.name,
        ]);
        FinancialTransactionDetailReportModal.save();
        FinancialTransactionDetailReportModal.verifyCalloutMessage();
      },
    );

    it(
      'C343317 Check that the "Export in progress" success toast appear when the user click on the "Save&close" button (vega)',
      { tags: ['criticalPath', 'vega', 'C343317'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.fillInRequiredFields({
          startDate: false,
          ownerName: ownerData.name,
        });
        FinancialTransactionDetailReportModal.save();
        FinancialTransactionDetailReportModal.verifyCalloutMessage();
      },
    );

    it(
      'C343318 Check that the "Something went wrong" error toast appears when the user click on the "Save&close" button (vega)',
      { tags: ['criticalPath', 'vega', 'C343318'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.fillInRequiredFields({
          startDate: false,
          ownerName: ownerData.name,
        });
        FinancialTransactionDetailReportModal.stubResponse500Error();
        FinancialTransactionDetailReportModal.save();
        FinancialTransactionDetailReportModal.verifyCalloutMessage();
        FinancialTransactionDetailReportModal.verifyCalloutErrorMessage();
      },
    );

    it(
      'C343322 Check that "No items found" error toast appears when user click on the "Save&close" button (vega)',
      { tags: ['criticalPath', 'vega', 'C343322'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.fillInRequiredFields({
          startDate: false,
          ownerName: ownerData.name,
        });
        FinancialTransactionDetailReportModal.save();
        FinancialTransactionDetailReportModal.verifyCalloutMessage();
        FinancialTransactionDetailReportModal.verifyCalloutNoItemsFoundMessage();
      },
    );

    it(
      'C343315 Check that the user can select service points in the "Associated service points" field (vega)',
      { tags: ['criticalPath', 'vega', 'C343315'] },
      () => {
        UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
        FinancialTransactionDetailReportModal.fillInRequiredFields({
          startDate: false,
          ownerName: ownerData.name,
        });
        FinancialTransactionDetailReportModal.fillInServicePoints([servicePoint1.name]);
        FinancialTransactionDetailReportModal.save();
        FinancialTransactionDetailReportModal.verifyCalloutMessage();
      },
    );
  });
});
