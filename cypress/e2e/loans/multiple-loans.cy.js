import uuid from 'uuid';

import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { Permissions } from '../../support/dictionary';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import Requests from '../../support/fragments/requests/requests';
import Users from '../../support/fragments/users/users';
import AppPaths from '../../support/fragments/app-paths';
import LoansPage from '../../support/fragments/loans/loansPage';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import Loans from '../../support/fragments/users/userDefaultObjects/loans';

const testData = {
  folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
  servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  requestsId: '',
};
const requestPolicyBody = {
  requestTypes: [REQUEST_TYPES.RECALL],
  name: getTestEntityValue('recallForCL'),
  id: uuid(),
};
let userData;
let userForRequest;

describe('Multiple loans', () => {
  before('Creating test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    RequestPolicy.createViaApi(requestPolicyBody);

    cy.createTempUser([Permissions.loansAll.gui, Permissions.loansView.gui])
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);

        Checkout.checkoutItemViaApi({
          itemBarcode: testData.folioInstances[0].barcodes[0],
          servicePointId: testData.servicePoint.id,
          userBarcode: userData.barcode,
        });
        cy.createTempUser([Permissions.requestsAll.gui]).then((userProperties) => {
          userForRequest = userProperties;
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userForRequest.userId);
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstances[1].barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: userData.barcode,
          }).then((checkoutResponse) => {
            Requests.createNewRequestViaApi({
              fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
              holdingsRecordId: testData.folioInstances[1].holdingId,
              instanceId: testData.folioInstances[1].instanceId,
              item: { barcode: testData.folioInstances[1].barcodes[0] },
              itemId: checkoutResponse.itemId,
              pickupServicePointId: testData.servicePoint.id,
              requestDate: new Date(),
              requestExpirationDate: new Date(new Date().getTime() + 86400000),
              requestLevel: REQUEST_LEVELS.ITEM,
              requestType: REQUEST_TYPES.RECALL,
              requesterId: userForRequest.userId,
            }).then((request) => {
              testData.requestsId = request.body.id;
            });
          });
        });

        cy.login(userData.username, userData.password);
      });
  });

  after('Delete test data', () => {
    Requests.deleteRequestViaApi(testData.requestsId);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userForRequest.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
    });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    Users.deleteViaApi(userForRequest.userId);
    Users.deleteViaApi(userData.userId);
  });

  it('C572: Multiple loans: Test change due date (vega) (TaaS)', () => {
    const itemBarcode = testData.folioInstances[0].barcodes[0];
    const item2Barcode = testData.folioInstances[1].barcodes[0];
    let loanDetails;

    // Navigate to a user's open loans page.
    cy.visit(AppPaths.getOpenLoansPath(userData.userId));
    // Check off one open loan for an item with the item status Checked out.
    LoansPage.checkOneLoan();
    // Change due date button becomes active.
    LoansPage.verifyChangeDueDateButtonIsActive();
    // Check off multiple loans for items with the item status Checked out.
    LoansPage.checkAll();
    // Click change due date.
    LoansPage.openChangeDueDate();
    // Enter date in the date field
    ChangeDueDateForm.fillDate('12/12/2030');
    // Click 'Save & close' button
    ChangeDueDateForm.saveAndClose();
    // Navigate to a loan for which the due date was just changed.
    UserLoans.openLoanDetails(itemBarcode);
    Loans.getApi(userData.userId).then(([returnedByPatron]) => {
      cy.getLoanHistory(returnedByPatron.id)
        .then(([loanHistoryFirstAction]) => {
          loanDetails = {
            action: 'Due date changed',
            dueDate: loanHistoryFirstAction.loan.dueDate,
            status: 'Checked out',
            source: userData.username,
            comment: '-',
          };
        })
        .then(() => {
          // Check details for item 1
          LoanDetails.checkLoanDetails(loanDetails);
          cy.visit(AppPaths.getOpenLoansPath(userData.userId));
          UserLoans.openLoanDetails(item2Barcode);
          // Check details for item 2
          LoanDetails.checkLoanDetails(loanDetails);
        });
    });
  });
});
