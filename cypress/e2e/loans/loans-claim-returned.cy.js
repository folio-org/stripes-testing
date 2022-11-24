import moment from 'moment';
import uuid from 'uuid';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix from '../../support/utils/stringTools';
import AppPaths from '../../support/fragments/app-paths';
import Loans from '../../support/fragments/loans/loansPage';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import ConfirmItemStatusModal from '../../support/fragments/users/loans/confirmItemStatusModal';
import CheckInClaimedReturnedItemModal from '../../support/fragments/checkin/modals/checkInClaimedReturnedItem';
import CheckInDeclareLostItemModal from '../../support/fragments/checkin/modals/checkInDeclareLostItem';
import Users from '../../support/fragments/users/users';
import Checkout from '../../support/fragments/checkout/checkout';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ConfirmClaimReturnedModal from '../../support/fragments/users/loans/confirmClaimReturnedModal';

function getClaimedReturnedLoansQuantity(loansArray) {
  let res = 0;

  for (let i = 0; i < loansArray.length; i++) {
    if (loansArray[i].status === 'Claimed returned') res++;
  }
  return res;
}

describe('Loans ', () => {
  let defaultLocation;
  const reasonWhyItemIsClaimedOut = 'reason why the item is claimed out';
  const reasonWhyItemIsDeclaredLost = 'reason why the item is declared lost';
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation('autotest loans claim returned', uuid());
  const testData = {};
  const userData = {};
  const ownerData = {};
  const itemStatuses = {
    checkedOut: 'Checked out',
    declaredLost: 'Declared lost',
    claimReturned: 'Claimed returned',
  };
  const itemsData = {
    itemsWithSeparateInstance: [{
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      instanceTitle: `Instance ${getRandomPostfix()}`,
    }]
  };

  const showOpenedUserLoansInUserCard = ({ username }) => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByKeywords(username);
    UsersSearchPane.openUser(username);
    UsersCard.openLoans();
  };

  const openOpenedUserLoans = ({ username }, quantityOpenLoans) => {
    showOpenedUserLoansInUserCard({ username });
    UsersCard.verifyQuantityOfOpenAndClaimReturnedLoans(quantityOpenLoans);
    UsersCard.showOpenedLoans();
  };

  before('Create user, open and closed loans', () => {
    itemsData.itemsWithSeparateInstance.forEach(function (item, index) { item.barcode = generateUniqueItemBarcodeWithShift(index); });

    cy.getAdminToken().then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { testData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingTypeId = res[0].id; });
      cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanTypeId = res[0].id; });
      cy.getMaterialTypes({ limit: 1 }).then((res) => { testData.materialTypeId = res.id; });
      UsersOwners.createViaApi({ ...UsersOwners.getDefaultNewOwner(uuid(), 'owner'), servicePointOwner: [{ value: servicePoint.id, label: servicePoint.name }] }).then(({ id, ownerName }) => {
        ownerData.name = ownerName;
        ownerData.id = id;
      });
      ServicePoints.createViaApi(servicePoint);
      defaultLocation = Location.getDefaultLocation(servicePoint.id);
      Location.createViaApi(defaultLocation);
    }).then(() => {
      itemsData.itemsWithSeparateInstance.forEach((item, index) => {
        InventoryInstances.createFolioInstanceViaApi({ instance: {
          instanceTypeId: testData.instanceTypeId,
          title: item.instanceTitle,
        },
        holdings: [{
          holdingsTypeId: testData.holdingTypeId,
          permanentLocationId: defaultLocation.id,
        }],
        items:[{
          barcode: item.barcode,
          status:  { name: 'Available' },
          permanentLoanType: { id: testData.loanTypeId },
          materialType: { id: testData.materialTypeId },
        }] }).then(specialInstanceIds => {
          itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
          itemsData.itemsWithSeparateInstance[index].holdingId = specialInstanceIds.holdingIds[0].id;
          itemsData.itemsWithSeparateInstance[index].itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      });
    });
    cy.createTempUser([permissions.checkinAll.gui,
      permissions.uiUsersViewLoans.gui,
      permissions.uiUsersView.gui,
      permissions.uiUsersDeclareItemLost.gui,
      permissions.uiUsersLoansClaimReturned.gui
    ])
      .then(userProperties => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        userData.firstName = userProperties.firstName;
        UserEdit.addServicePointViaApi(servicePoint.id,
          userData.userId, servicePoint.id);
      })
      .then(() => {
        cy.loginAsAdmin();
        itemsData.itemsWithSeparateInstance.forEach((item, index) => {
          item.index = index;
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: item.barcode,
            loanDate: moment.utc().format(),
            servicePointId: servicePoint.id,
            userBarcode: userData.barcode,
          });
          if (index % 2 === 1) {
            cy.visit(AppPaths.getOpenLoansPath(userData.userId));
            UserLoans.verifyNumberOfLoans(index + 1);
            UserLoans.declareLoanLostByBarcode(item.barcode);
            ConfirmItemStatusModal.confirmItemStatus(reasonWhyItemIsDeclaredLost);
            UserLoans.checkResultsInTheRowByBarcode([itemStatuses.declaredLost], item.barcode);
            item.status = itemStatuses.declaredLost;
          } else item.status = itemStatuses.checkedOut;
        });
      });
  });

  after('Delete New Service point, Item and User', () => {
    UsersOwners.deleteViaApi(ownerData.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    ServicePoints.deleteViaApi(servicePoint.id);
    Users.deleteViaApi(userData.userId)
      .then(
        () => itemsData.itemsWithSeparateInstance.forEach(
          (item, index) => {
            cy.deleteItem(item.itemId);
            cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
            InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
          }
        )
      );
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id
    );
  });

  it('C10959 Loans: Claim returned (vega)', { tags: [TestTypes.smoke, devTeams.vega] }, () => {
    const selectedItems = [];
    let claimedReturnedLoansQuantity;
    const claimedReturnedModalTitle = 'Claimed returned';
    let selectedItem = itemsData.itemsWithSeparateInstance.find(item => item.status === itemStatuses.checkedOut);
    cy.login(userData.username, userData.password).then(() => {
      openOpenedUserLoans(userData, itemsData.itemsWithSeparateInstance.length);
      UserLoans.openLoan(selectedItem.barcode);
      Loans.claimReturnedButtonIsVisible();
      Loans.claimReturned();
      ConfirmItemStatusModal.verifyModalView(claimedReturnedModalTitle).then(() => {
        Loans.verifyResultsInTheRow([itemStatuses.checkedOut]);
      });
      Loans.claimReturnedAndConfirm(reasonWhyItemIsClaimedOut).then(() => {
        Loans.resolveClaimedIsVisible();
        itemsData.itemsWithSeparateInstance.find(function (item) {
          if (item.barcode === selectedItem.barcode) {
            item.status = itemStatuses.claimReturned;
            return true;
          }
          return false;
        });
        Loans.checkItemStatus(itemStatuses.claimReturned);
        Loans.checkClaimReturnedDateTime();
        Loans.verifyResultsInTheRow([itemStatuses.claimReturned, userData.firstName, reasonWhyItemIsClaimedOut]);
        Loans.dismissPane().then(() => {
          claimedReturnedLoansQuantity = getClaimedReturnedLoansQuantity(itemsData.itemsWithSeparateInstance);
          UserLoans.verifyQuantityOpenAndClaimedReturnedLoans(itemsData.itemsWithSeparateInstance.length, claimedReturnedLoansQuantity);
          selectedItem = itemsData.itemsWithSeparateInstance.find(item => item.status === itemStatuses.checkedOut);
          UserLoans.openActionsMenuOfLoanByBarcode(selectedItem.barcode);
        });
      });
      Loans.claimReturned();
      ConfirmItemStatusModal.verifyModalView(claimedReturnedModalTitle).then(() => {
        UserLoans.checkResultsInTheRowByBarcode([itemStatuses.checkedOut], selectedItem.barcode);
        UserLoans.openActionsMenuOfLoanByBarcode(selectedItem.barcode);
      });
      Loans.claimReturnedAndConfirm(reasonWhyItemIsClaimedOut).then(() => {
        itemsData.itemsWithSeparateInstance.find(function (item) {
          if (item.barcode === selectedItem.barcode) {
            item.status = itemStatuses.claimReturned;
            return true;
          }
          return false;
        });
        claimedReturnedLoansQuantity = getClaimedReturnedLoansQuantity(itemsData.itemsWithSeparateInstance);
        UserLoans.verifyQuantityOpenAndClaimedReturnedLoans(itemsData.itemsWithSeparateInstance.length, claimedReturnedLoansQuantity);
        UserLoans.checkResultsInTheRowByBarcode([itemStatuses.claimReturned], selectedItem.barcode);
      });
      UserLoans.openLoan(selectedItem.barcode);
      Loans.resolveClaimedIsVisible();
      Loans.checkItemStatus(itemStatuses.claimReturned);
      Loans.checkClaimReturnedDateTime();
      Loans.verifyResultsInTheRow([itemStatuses.claimReturned, userData.firstName, reasonWhyItemIsClaimedOut]);
      Loans.dismissPane().then(() => {
        Loans.claimReturnedButtonIsDisabled();
      });
      selectedItems.push(selectedItem);
      UserLoans.checkOffLoanByBarcode(selectedItem.barcode);
      UserLoans.verifyClaimReturnedButtonIsDisabled().then(() => {
        selectedItem = itemsData.itemsWithSeparateInstance.find(item => item.status === itemStatuses.checkedOut);
        selectedItems.push(selectedItem);
        UserLoans.checkOffLoanByBarcode(selectedItem.barcode);
      }).then(() => {
        itemsData.itemsWithSeparateInstance.find(function (item) {
          if (item.barcode === selectedItem.barcode) {
            item.status = itemStatuses.claimReturned;
            return true;
          }
          return false;
        });
      });
      UserLoans.verifyClaimReturnedButtonIsVisible().then(() => {
        selectedItem = itemsData.itemsWithSeparateInstance.find(item => item.status === itemStatuses.declaredLost);
        selectedItems.push(selectedItem);
        UserLoans.checkOffLoanByBarcode(selectedItem.barcode);
      }).then(() => {
        itemsData.itemsWithSeparateInstance.find(function (item) {
          if (item.barcode === selectedItem.barcode) {
            item.status = itemStatuses.claimReturned;
            return true;
          }
          return false;
        });
      });
      UserLoans.openClaimReturnedPane();
      ConfirmClaimReturnedModal.verifyNumberOfItemsToBeClaimReturned(3);
      ConfirmClaimReturnedModal.verifyModalView();
      UserLoans.openClaimReturnedPane();
      ConfirmClaimReturnedModal.confirmItemStatus(reasonWhyItemIsClaimedOut).then(() => {
        selectedItems.forEach(item => {
          UserLoans.checkResultsInTheRowByBarcode([item.status], item.barcode);
          UserLoans.openLoan(item.barcode);
          Loans.resolveClaimedIsVisible();
          Loans.checkItemStatus(itemStatuses.claimReturned);
          Loans.checkClaimReturnedDateTime();
          Loans.verifyResultsInTheRow([itemStatuses.claimReturned, userData.firstName, reasonWhyItemIsClaimedOut]);
          Loans.dismissPane();
        });
        cy.visit(TopMenu.checkInPath);
      });
      cy.wrap(selectedItems).each(item => {
        CheckInActions.checkInItemGui(item.barcode).then(() => {
          if (item.status !== itemStatuses.declaredLost) {
            CheckInClaimedReturnedItemModal.chooseItemReturnedByPatron();
            CheckInClaimedReturnedItemModal.verifyModalIsClosed();
            CheckInActions.verifyLastCheckInItem(item.barcode);
          } else {
            CheckInDeclareLostItemModal.confirm();
            CheckInActions.verifyLastCheckInItem(item.barcode);
          }
        });
      });
      showOpenedUserLoansInUserCard(userData);
      UsersCard.verifyQuantityOfOpenAndClaimReturnedLoans(2, 1);
      cy.visit(TopMenu.checkInPath).then(() => {
        cy.wrap(itemsData.itemsWithSeparateInstance).each(item => {
          if (item.barcode !== selectedItems[0].barcode && item.barcode !== selectedItems[1].barcode &&
            item.barcode !== selectedItems[2].barcode) {
            CheckInActions.checkInItemGui(item.barcode).then(() => {
              if (item.status !== itemStatuses.declaredLost) {
                CheckInClaimedReturnedItemModal.chooseItemReturnedByPatron();
                CheckInClaimedReturnedItemModal.verifyModalIsClosed();
                CheckInActions.verifyLastCheckInItem(item.barcode);
              } else {
                CheckInDeclareLostItemModal.confirm();
                CheckInActions.verifyLastCheckInItem(item.barcode);
              }
            });
          }
        });
      });
    });
  });
});
