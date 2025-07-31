import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ClaimedReturned from '../../support/fragments/checkin/modals/checkInClaimedReturnedItem';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import Loans from '../../support/fragments/users/userDefaultObjects/loans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Check in', () => {
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
        cy.getDefaultMaterialType().then((materialTypes) => {
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
              specialInstanceIds.holdings[0].id;
            itemsData.itemsWithSeparateInstance[index].itemId = specialInstanceIds.items[0].id;
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
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePointS.id]);
    ServicePoints.deleteViaApi(testData.servicePointS.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.get('@items').each((item, index) => {
      cy.deleteItemViaApi(item.itemId);
      cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
      InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
    });
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    cy.deleteLoanType(testData.loanTypeId);
  });
  it(
    'C10974 Check In: claimed returned items (vega)',
    { tags: ['criticalPath', 'vega', 'C10974'] },
    () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });

      const itemForFoundByLibrary = itemsData.itemsWithSeparateInstance[0];

      CheckInActions.checkInItemGui(itemForFoundByLibrary.barcode);
      ClaimedReturned.checkModalMessage(itemForFoundByLibrary);
      ClaimedReturned.closeModal();
      CheckInActions.checkInItemGui(itemForFoundByLibrary.barcode);
      ClaimedReturned.checkModalMessage(itemForFoundByLibrary);
      ClaimedReturned.chooseItemReturnedByLibrary();

      // workaround for UICHKIN-483
      CheckInActions.openActions();
      CheckInActions.clickLoanDetailsOption();
      CheckInActions.openCheckInPane();

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

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.checkInItemGui(itemReturnedByPatron.barcode);
      ClaimedReturned.checkModalMessage(itemReturnedByPatron);
      ClaimedReturned.chooseItemReturnedByPatron();

      // workaround for UICHKIN-483
      CheckInActions.openActions();

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
