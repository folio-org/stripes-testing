import uuid from 'uuid';
import moment from 'moment';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix from '../../support/utils/stringTools';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import permissions from '../../support/dictionary/permissions';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import Users from '../../support/fragments/users/users';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import ClaimedReturned from '../../support/fragments/checkin/modals/checkInClaimedReturnedItem';
import Loans from '../../support/fragments/users/userDefaultObjects/loans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UsersCard from '../../support/fragments/users/usersCard';
import { ITEM_STATUS_NAMES } from '../../support/constants';

describe('Check In - Actions', () => {
  const userData = {};
  const patronGroup = {
    name: `groupCheckIn ${getRandomPostfix()}`,
  };
  const testData = {
    servicePointS: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const itemsData = {
    itemsWithSeparateInstance: [
      { title: `InstanceForFoundByLibrary ${getRandomPostfix()}` },
      { title: `InstanceForReturnedByPatron ${getRandomPostfix()}` },
    ],
  };

  before('Preconditions', () => {
    itemsData.itemsWithSeparateInstance.forEach((item, index) => {
      item.barcode = generateUniqueItemBarcodeWithShift(index);
    });

    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.servicePointS);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePointS.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
          testData.materialType = materialTypes.name;
        });
      })
      .then(() => {
        itemsData.itemsWithSeparateInstance.forEach((item, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: item.title,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: item.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
            itemsData.itemsWithSeparateInstance[index].holdingId =
              specialInstanceIds.holdingIds[0].id;
            itemsData.itemsWithSeparateInstance[index].itemId =
              specialInstanceIds.holdingIds[0].itemIds;
            itemsData.itemsWithSeparateInstance[index].materialType = testData.materialType;
          });
        });
        cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
      });

    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });

    cy.createTempUser([permissions.checkinAll.gui, permissions.loansView.gui], patronGroup.name)
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(
          testData.servicePointS.id,
          userData.userId,
          testData.servicePointS.id,
        );

        cy.get('@items').each((item) => {
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: item.barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.servicePointS.id,
            userBarcode: userData.barcode,
          });
        });

        UserLoans.getUserLoansIdViaApi(userData.userId).then((userLoans) => {
          userLoans.loans.forEach(({ id }) => {
            UserLoans.claimItemReturnedViaApi(
              { itemClaimedReturnedDateTime: moment.utc().format() },
              id,
            );
          });
        });

        cy.login(userData.username, userData.password);
      });
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePointS.id]);
    ServicePoints.deleteViaApi(testData.servicePointS.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.get('@items').each((item, index) => {
      cy.deleteItemViaApi(item.itemId);
      cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
      InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
    });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    cy.deleteLoanType(testData.loanTypeId);
  });
  it(
    'C10974 Check In: claimed returned items (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      const itemForFoundByLibrary = itemsData.itemsWithSeparateInstance[0];
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(itemForFoundByLibrary.barcode);
      ClaimedReturned.checkModalMessage(itemForFoundByLibrary);
      ClaimedReturned.closeModal();
      CheckInActions.checkInItemGui(itemForFoundByLibrary.barcode);
      ClaimedReturned.checkModalMessage(itemForFoundByLibrary);
      ClaimedReturned.chooseItemReturnedByLibrary();
      CheckInActions.openLoanDetails(userData.username);
      UsersCard.getApi(userData.userId).then((user) => {
        Loans.getApi(userData.userId).then(([foundByLibraryLoan]) => {
          cy.getLoanHistory(foundByLibraryLoan.id).then(([loanHistoryFirstAction]) => {
            LoanDetails.checkAction('Checked in (found by library)');
            LoanDetails.checkLoansActionsHaveSameDueDate(0, 1, loanHistoryFirstAction.loan.dueDate);
            LoanDetails.checkStatusInList(0, ITEM_STATUS_NAMES.AVAILABLE);
            LoanDetails.checkSource(0, user);
          });
        });
      });

      const itemReturnedByPatron = itemsData.itemsWithSeparateInstance[1];
      cy.visit(TopMenu.checkInPath);
      CheckInActions.checkInItemGui(itemReturnedByPatron.barcode);
      ClaimedReturned.checkModalMessage(itemReturnedByPatron);
      ClaimedReturned.chooseItemReturnedByPatron();
      CheckInActions.openLoanDetails(userData.username);
      UsersCard.getApi(userData.userId).then((user) => {
        Loans.getApi(userData.userId).then(([returnedByPatron]) => {
          cy.getLoanHistory(returnedByPatron.id).then(([loanHistoryFirstAction]) => {
            LoanDetails.checkAction('Checked in (returned by patron)');
            LoanDetails.checkLoansActionsHaveSameDueDate(0, 1, loanHistoryFirstAction.loan.dueDate);
            LoanDetails.checkStatusInList(0, ITEM_STATUS_NAMES.AVAILABLE);
            LoanDetails.checkSource(0, user);
          });
        });
      });
    },
  );
});
