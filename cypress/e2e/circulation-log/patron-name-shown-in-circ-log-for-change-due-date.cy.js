import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import Checkout from '../../support/fragments/checkout/checkout';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import LoansPage from '../../support/fragments/loans/loansPage';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';

describe('Circulation log', () => {
  const patronGroup = {
    name: getTestEntityValue('GroupCircLog'),
  };
  let userA;
  let userB;
  const itemData = {
    barcode: generateItemBarcode(),
    title: getTestEntityValue('InstanceCircLog'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: getTestEntityValue('typeForCL'),
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: itemData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          itemData.instanceId = specialInstanceIds.instanceId;
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
      ],
      patronGroup.name,
    ).then((userAProperties) => {
      userA = userAProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userA.userId,
        testData.userServicePoint.id,
      );
      cy.createTempUser([permissions.requestsAll.gui], patronGroup.name).then((userBProperties) => {
        userB = userBProperties;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userB.userId,
          testData.userServicePoint.id,
        );
      });
      cy.login(userA.username, userA.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(userA.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userB.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userA.userId);
    Users.deleteViaApi(userB.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C407706 Correct Patron name shown in the "Source" field of Circulation log for "Change Due Date" loan type (volaris)',
    { tags: [TestTypes.extendedPath, devTeams.volaris] },
    () => {
      CheckOutActions.checkOutUser(userB.barcode);
      CheckOutActions.checkOutItem(itemData.barcode);
      CheckOutActions.checkItemInfo(itemData.barcode, itemData.title);
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
