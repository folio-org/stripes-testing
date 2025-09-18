import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import LoansPage from '../../support/fragments/loans/loansPage';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Circulation log', () => {
  const patronGroup = {
    name: getTestEntityValue('GroupCircLog'),
  };
  let userA;
  let userB;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    cy.createTempUser(
      [
        permissions.checkoutAll.gui,
        permissions.circulationLogView.gui,
        permissions.uiUsersfeefinesView.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserLoansChangeDueDate.gui,
        permissions.uiCirculationCreateViewOverdueFinesPolicies.gui,
      ],
      patronGroup.name,
    ).then((userAProperties) => {
      userA = userAProperties;
      UserEdit.addServicePointViaApi(
        testData.servicePoint.id,
        userA.userId,
        testData.servicePoint.id,
      );
      cy.createTempUser([permissions.uiRequestsAll.gui], patronGroup.name).then(
        (userBProperties) => {
          userB = userBProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            userB.userId,
            testData.servicePoint.id,
          );
        },
      );
      cy.login(userA.username, userA.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
        authRefresh: true,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: testData.folioInstances[0].barcodes[0],
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(userA.userId, [testData.servicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userB.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userA.userId);
    Users.deleteViaApi(userB.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      testData.folioInstances[0].barcodes[0],
    );
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C407706 Correct Patron name shown in the "Source" field of Circulation log for "Change Due Date" loan type (volaris)',
    { tags: ['extendedPath', 'volaris', 'C407706'] },
    () => {
      CheckOutActions.checkOutUser(userB.barcode);
      CheckOutActions.checkOutItem(testData.folioInstances[0].barcodes[0]);
      CheckOutActions.checkItemInfo(
        testData.folioInstances[0].barcodes[0],
        testData.folioInstances[0].instanceTitle,
      );
      CheckOutActions.openLoanDetails();
      LoansPage.openChangeDueDate();
      ChangeDueDateForm.fillDate('10/07/2030');
      ChangeDueDateForm.saveAndClose();

      cy.visit(TopMenu.circulationLogPath);
      SearchPane.searchByUserBarcode(userB.barcode);
      SearchPane.checkResultSearch({
        userBarcode: userB.barcode,
        object: 'Loan',
        circAction: 'Changed due date',
        source: `${userA.lastName}, ${userA.firstName}`,
      });
    },
  );
});
