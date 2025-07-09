import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInClaimedReturnedItemModal from '../../support/fragments/checkin/modals/checkInClaimedReturnedItem';
import CheckInDeclareLostItemModal from '../../support/fragments/checkin/modals/checkInDeclareLostItem';
import Checkout from '../../support/fragments/checkout/checkout';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Loans from '../../support/fragments/loans/loansPage';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import ConfirmClaimReturnedModal from '../../support/fragments/users/loans/confirmClaimReturnedModal';
import ConfirmItemStatusModal from '../../support/fragments/users/loans/confirmItemStatusModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';

function getClaimedReturnedLoansQuantity(loansArray) {
  let res = 0;

  for (let i = 0; i < loansArray.length; i++) {
    if (loansArray[i].status === 'Claimed returned') res++;
  }
  return res;
}

describe('Loans', () => {
  describe('Loans: Claim returned', () => {
    let defaultLocation;
    let userData;

    const reasonWhyItemIsClaimedOut = 'reason why the item is claimed out';
    const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
    const folioInstances = InventoryInstances.generateFolioInstances({ count: 5 });
    const ownerData = UsersOwners.getDefaultNewOwner();
    const lostItemFeePolicyBody = {
      name: 'claim_returned' + getRandomPostfix(),
      chargeAmountItem: {
        chargeType: 'actualCost',
        amount: '0.00',
      },
      lostItemProcessingFee: '0.00',
      chargeAmountItemPatron: true,
      chargeAmountItemSystem: true,
      lostItemChargeFeeFine: {
        duration: 2,
        intervalId: 'Days',
      },
      returnedLostItemProcessingFee: true,
      lostItemReturned: 'Charge',
      replacedLostItemProcessingFee: true,
      replacementAllowed: true,
      replacementProcessingFee: '0.00',
      id: uuid(),
    };

    before('Create user, open and closed loans', () => {
      cy.getAdminToken().then(() => {
        UsersOwners.createViaApi({
          ...ownerData,
          servicePointOwner: [{ value: servicePoint.id, label: servicePoint.name }],
        });
        ServicePoints.createViaApi(servicePoint);
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
            location,
          });
        });
      });
      LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);
      cy.createTempUser([
        permissions.checkinAll.gui,
        permissions.uiUsersViewLoans.gui,
        permissions.uiUsersView.gui,
        permissions.uiUsersDeclareItemLost.gui,
        permissions.uiUsersLoansClaimReturned.gui,
      ])
        .then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);
        })
        .then(() => {
          folioInstances.forEach((item, index) => {
            item.barcodes.forEach((barcode) => {
              Checkout.checkoutItemViaApi({
                itemBarcode: barcode,
                servicePointId: servicePoint.id,
                userBarcode: userData.barcode,
              }).then(({ id: loanId }) => {
                if (index % 2 === 1) {
                  UserLoans.declareLoanLostViaApi(
                    {
                      id: item.itemIds[0],
                      servicePointId: servicePoint.id,
                    },
                    loanId,
                  );
                  item.status = ITEM_STATUS_NAMES.DECLARED_LOST;
                } else {
                  item.status = ITEM_STATUS_NAMES.CHECKED_OUT;
                }
              });
            });
          });
        })
        .then(() => {
          cy.wait(10000);
        });
    });

    after('Delete New Service point, Item and User', () => {
      cy.getAdminToken();
      UsersOwners.deleteViaApi(ownerData.id);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
      ServicePoints.deleteViaApi(servicePoint.id);
      Users.deleteViaApi(userData.userId).then(() => folioInstances.forEach((item) => {
        item.itemIds.forEach((id) => cy.deleteItemViaApi(id));
        cy.deleteHoldingRecordViaApi(item.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(item.instanceId);
      }));
      LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        defaultLocation.institutionId,
        defaultLocation.campusId,
        defaultLocation.libraryId,
        defaultLocation.id,
      );
    });

    it(
      'C10959 Loans: Claim returned (vega)',
      { tags: ['smoke', 'vega', 'system', 'shiftLeftBroken', 'C10959'] },
      () => {
        const selectedItems = [];
        let claimedReturnedLoansQuantity;
        let selectedItem = folioInstances.find(
          (item) => item.status === ITEM_STATUS_NAMES.CHECKED_OUT,
        );
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        UsersSearchPane.openUserCard(userData.username);
        UsersCard.viewCurrentLoans({ openLoans: folioInstances.length });
        UserLoans.openLoanDetails(selectedItem.barcodes[0]);
        Loans.claimReturnedButtonIsVisible();
        Loans.claimReturned();
        ConfirmItemStatusModal.verifyModalView({ action: ITEM_STATUS_NAMES.CLAIMED_RETURNED });
        ConfirmItemStatusModal.closeModal().then(() => {
          Loans.verifyResultsInTheRow([ITEM_STATUS_NAMES.CHECKED_OUT]);
        });
        Loans.claimReturnedAndConfirm(reasonWhyItemIsClaimedOut);
        Loans.resolveClaimedIsVisible();
        folioInstances.find((item) => {
          if (item.barcodes[0] === selectedItem.barcodes[0]) {
            item.status = ITEM_STATUS_NAMES.CLAIMED_RETURNED;
            return true;
          }
          return false;
        });
        Loans.checkItemStatus(ITEM_STATUS_NAMES.CLAIMED_RETURNED);
        Loans.checkClaimReturnedDateTime();
        Loans.verifyResultsInTheRow([
          ITEM_STATUS_NAMES.CLAIMED_RETURNED,
          userData.username,
          reasonWhyItemIsClaimedOut,
        ]);
        Loans.dismissPane().then(() => {
          claimedReturnedLoansQuantity = getClaimedReturnedLoansQuantity(folioInstances);
          UserLoans.verifyQuantityOpenAndClaimedReturnedLoans(
            folioInstances.length,
            claimedReturnedLoansQuantity,
          );
          selectedItem = folioInstances.find(
            (item) => item.status === ITEM_STATUS_NAMES.CHECKED_OUT,
          );
          UserLoans.openActionsMenuOfLoanByBarcode(selectedItem.barcodes[0]);
        });
        Loans.claimReturned();
        ConfirmItemStatusModal.verifyModalView({ action: ITEM_STATUS_NAMES.CLAIMED_RETURNED });
        ConfirmItemStatusModal.closeModal().then(() => {
          UserLoans.checkResultsInTheRowByBarcode(
            [ITEM_STATUS_NAMES.CHECKED_OUT],
            selectedItem.barcodes[0],
          );
          UserLoans.openActionsMenuOfLoanByBarcode(selectedItem.barcodes[0]);
        });
        Loans.claimReturnedAndConfirm(reasonWhyItemIsClaimedOut);
        folioInstances.find((item) => {
          if (item.barcodes[0] === selectedItem.barcodes[0]) {
            item.status = ITEM_STATUS_NAMES.CLAIMED_RETURNED;
            return true;
          }
          return false;
        });
        claimedReturnedLoansQuantity = getClaimedReturnedLoansQuantity(folioInstances);
        UserLoans.verifyQuantityOpenAndClaimedReturnedLoans(
          folioInstances.length,
          claimedReturnedLoansQuantity,
        );
        UserLoans.checkResultsInTheRowByBarcode(
          [ITEM_STATUS_NAMES.CLAIMED_RETURNED],
          selectedItem.barcodes[0],
        );
        UserLoans.openLoanDetails(selectedItem.barcodes[0]);
        Loans.resolveClaimedIsVisible();
        Loans.checkItemStatus(ITEM_STATUS_NAMES.CLAIMED_RETURNED);
        Loans.checkClaimReturnedDateTime();
        Loans.verifyResultsInTheRow([
          ITEM_STATUS_NAMES.CLAIMED_RETURNED,
          userData.username,
          reasonWhyItemIsClaimedOut,
        ]);
        Loans.dismissPane().then(() => {
          Loans.claimReturnedButtonIsDisabled();
        });
        selectedItems.push(selectedItem);
        UserLoans.checkOffLoanByBarcode(selectedItem.barcodes[0])
          .then(() => {
            UserLoans.verifyClaimReturnedButtonIsDisabled();
            selectedItem = folioInstances.find(
              (item) => item.status === ITEM_STATUS_NAMES.CHECKED_OUT,
            );
            selectedItems.push(selectedItem);
            UserLoans.checkOffLoanByBarcode(selectedItem.barcodes[0]);
          })
          .then(() => {
            folioInstances.find((item) => {
              if (item.barcodes[0] === selectedItem.barcodes[0]) {
                item.status = ITEM_STATUS_NAMES.CLAIMED_RETURNED;
                return true;
              }
              return false;
            });
          })
          .then(() => {
            selectedItem = folioInstances.find(
              (item) => item.status === ITEM_STATUS_NAMES.DECLARED_LOST,
            );
            selectedItems.push(selectedItem);
            UserLoans.checkOffLoanByBarcode(selectedItem.barcodes[0]);
            UserLoans.verifyClaimReturnedButtonIsVisible();
          })
          .then(() => {
            folioInstances.find((item) => {
              if (item.barcodes[0] === selectedItem.barcodes[0]) {
                item.status = ITEM_STATUS_NAMES.CLAIMED_RETURNED;
                return true;
              }
              return false;
            });
          });
        UserLoans.openClaimReturnedPane();
        ConfirmClaimReturnedModal.verifyNumberOfItemsToBeClaimReturned(3);
        ConfirmClaimReturnedModal.verifyModalView({ action: ITEM_STATUS_NAMES.CLAIMED_RETURNED });
        ConfirmClaimReturnedModal.closeModal();
        UserLoans.openClaimReturnedPane();
        ConfirmClaimReturnedModal.confirmItemStatus(reasonWhyItemIsClaimedOut).then(() => {
          selectedItems.forEach((item) => {
            UserLoans.checkResultsInTheRowByBarcode([item.status], item.barcodes[0]);
            UserLoans.openLoanDetails(item.barcodes[0]);
            Loans.resolveClaimedIsVisible();
            Loans.checkItemStatus(ITEM_STATUS_NAMES.CLAIMED_RETURNED);
            Loans.checkClaimReturnedDateTime();
            Loans.verifyResultsInTheRow([
              ITEM_STATUS_NAMES.CLAIMED_RETURNED,
              userData.username,
              reasonWhyItemIsClaimedOut,
            ]);
            Loans.dismissPane();
          });
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        });
        cy.wrap(selectedItems).each((item) => {
          CheckInActions.checkInItemGui(item.barcodes[0]).then(() => {
            if (item.status !== ITEM_STATUS_NAMES.DECLARED_LOST) {
              CheckInClaimedReturnedItemModal.chooseItemReturnedByPatron();
              CheckInClaimedReturnedItemModal.verifyModalIsClosed();
              CheckInActions.verifyLastCheckInItem(item.barcodes[0]);
            } else {
              CheckInDeclareLostItemModal.confirm();
              CheckInActions.verifyLastCheckInItem(item.barcodes[0]);
            }
          });
        });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Loans.closeLoanDetails();
        UsersSearchPane.openUserCard(userData.username);
        UsersCard.expandLoansSection(2, 0);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN).then(() => {
          cy.wrap(folioInstances).each((item) => {
            if (
              item.barcodes[0] !== selectedItems[0].barcodes[0] &&
              item.barcodes[0] !== selectedItems[1].barcodes[0] &&
              item.barcodes[0] !== selectedItems[2].barcodes[0]
            ) {
              CheckInActions.checkInItemGui(item.barcodes[0]).then(() => {
                if (item.status === ITEM_STATUS_NAMES.DECLARED_LOST) {
                  CheckInDeclareLostItemModal.confirm();
                  CheckInActions.verifyLastCheckInItem(item.barcodes[0]);
                } else {
                  CheckInActions.verifyLastCheckInItem(item.barcodes[0]);
                }
              });
            }
          });
        });
      },
    );
  });
});
