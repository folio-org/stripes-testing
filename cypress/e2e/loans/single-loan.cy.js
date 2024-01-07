import uuid from 'uuid';
import moment from 'moment/moment';

import { ITEM_STATUS_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import { DateTools } from '../../support/utils';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UsersCard from '../../support/fragments/users/usersCard';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import Checkout from '../../support/fragments/checkout/checkout';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Loans from '../../support/fragments/users/userDefaultObjects/loans';

describe('Loans', () => {
  describe('Loans:  Change due date', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };
    let itemBarcode;

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      itemBarcode = testData.folioInstances[0].barcodes[0];
      cy.createTempUser([
        Permissions.uiUsersView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiUserLoansChangeDueDate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.user.userId,
          testData.servicePoint.id,
        );

        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.servicePoint.id,
          userBarcode: testData.user.barcode,
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      CheckInActions.checkinItemViaApi({
        itemBarcode,
        servicePointId: testData.servicePoint.id,
      });
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C565 Single loan: Test change due date (vega) (TaaS)',
      { tags: ['extendedPath', 'vega'] },
      () => {
        const FIRST_ACTION_ROW_INDEX = 0;
        const itemData = {
          title: testData.folioInstances[0].instanceTitle,
          itemStatus: 'Checked out',
          itemBarcode,
        };
        // Go to Users app. Find user with open loan. Click on "x open loan(s)" to open loans table.
        UsersSearchPane.searchByKeywords(testData.user.username);
        UsersSearchPane.openUser(testData.user.userId);
        UsersCard.viewCurrentLoans();
        UserLoans.checkResultsInTheRowByBarcode([ITEM_STATUS_NAMES.CHECKED_OUT], itemBarcode);
        const loanDueDateAfterChanged = DateTools.getCurrentEndOfDay().add(1, 'day');
        // Click checkbox on one row to select single loan and press "Change due date" button
        UserLoans.openLoanDetails(itemBarcode);
        UserLoans.openChangeDueDatePane();
        // Select a date in the future, save and close
        ChangeDueDateForm.verifyChangeDueDateForm(itemData);
        ChangeDueDateForm.fillDate(loanDueDateAfterChanged.format('MM/DD/YYYY'));
        ChangeDueDateForm.saveAndClose();
        // Navigate to loan details for that loan.
        LoanDetails.checkActionDueDate(FIRST_ACTION_ROW_INDEX, loanDueDateAfterChanged);
        LoanDetails.checkStatusInList(FIRST_ACTION_ROW_INDEX, ITEM_STATUS_NAMES.CHECKED_OUT);
        UsersCard.getApi(testData.user.userId).then((user) => {
          Loans.getApi(testData.user.userId).then(([foundByLibraryLoan]) => {
            cy.getLoanHistory(foundByLibraryLoan.id).then(([loanHistoryFirstAction]) => {
              LoanDetails.checkAction(FIRST_ACTION_ROW_INDEX, 'Due date changed');
              LoanDetails.checkSource(FIRST_ACTION_ROW_INDEX, user);
              LoanDetails.checkComments(FIRST_ACTION_ROW_INDEX, '-');
              LoanDetails.checkActionDate(
                FIRST_ACTION_ROW_INDEX,
                loanHistoryFirstAction.loan.metadata.updatedDate,
              );
            });
          });
        });
      },
    );
  });
});
