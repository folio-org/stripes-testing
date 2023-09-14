import uuid from 'uuid';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../../support/fragments/topMenu';
import ManualCharges from '../../../support/fragments/settings/users/manualCharges';
import UsersCard from '../../../support/fragments/users/usersCard';
import WaiveReasons from '../../../support/fragments/settings/users/waiveReasons';
import Users from '../../../support/fragments/users/users';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import NewFeeFine from '../../../support/fragments/users/newFeeFine';
import UserAllFeesFines from '../../../support/fragments/users/userAllFeesFines';
import WaiveFeeFinesModal from '../../../support/fragments/users/waiveFeeFineModal';
import WaiveFeeFinesWarningModal from '../../../support/fragments/users/waiveFeeFineWarningModal';
import getRandomPostfix from '../../../support/utils/stringTools';

const waiveSelectedFeeFines = (waiveReason) => {
  UserAllFeesFines.clickWaive();
  WaiveFeeFinesModal.waitLoading();
  WaiveFeeFinesModal.selectWaiveReason(waiveReason);
  WaiveFeeFinesModal.confirm();
};

describe('ui-users: C465 Verify that library staff can fully and partially waive one or more fees/fines for a patron', () => {
  const testData = [];
  const feeFinesNumber = 3;
  let user;
  let patronGroupId;
  const waiveReason = `testWaiveReason${getRandomPostfix()}`;
  const chargeAmount = ManualCharges.defaultFeeFineType.defaultAmount;

  const createFeeFine = (i) => {
    UsersCard.openFeeFines();
    UsersCard.startFeeFineAdding();

    NewFeeFine.setFeeFineOwner(testData[i].owner.name);
    NewFeeFine.checkFilteredFeeFineType(testData[i].feeFineType.feeFineTypeName);
    NewFeeFine.setFeeFineType(testData[i].feeFineType.feeFineTypeName);
    NewFeeFine.checkAmount(chargeAmount);

    NewFeeFine.chargeOnly();
  };

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken().then(() => {
      PatronGroups.createViaApi().then((id) => {
        patronGroupId = id;
        Users.createViaApi({
          patronGroup: id,
          ...Users.defaultUser,
        }).then((createdUser) => {
          user = createdUser;

          for (let i = 0; i < feeFinesNumber; i++) {
            const item = {};
            UsersOwners.createViaApi({ owner: uuid() }).then((response) => {
              item.owner = { id: response.id, name: response.owner };

              ManualCharges.createViaApi({
                ...ManualCharges.defaultFeeFineType,
                ownerId: response.id,
              }).then((manualCharge) => {
                item.feeFineType = {
                  id: manualCharge.id,
                  feeFineTypeName: manualCharge.feeFineType,
                };

                WaiveReasons.createViaApi({ id: uuid(), nameReason: waiveReason }).then(
                  (reason) => {
                    item.waiveReason = { id: reason.id, nameReason: reason.nameReason };
                  },
                );
              });
            });

            testData.push(item);
          }
        });
      });

      cy.visit(TopMenu.usersPath);
    });
  });

  before('add fee&fines to a user', () => {
    UsersSearchPane.waitLoading();
    UsersSearchPane.searchByStatus('Active');
    UsersSearchPane.searchByKeywords(user.id);
    UsersSearchPane.openUser(user.id);

    UsersCard.waitLoading();

    // Add fee/fines to user
    for (let i = 0; i < feeFinesNumber; i++) {
      createFeeFine(i);
    }

    UsersCard.openFeeFines();
    UsersCard.viewAllFeesFines();
  });

  before('Make waived fee/fine', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickRowCheckbox(0);
    UserAllFeesFines.checkWaiveButtonActive(true);
    waiveSelectedFeeFines(waiveReason);
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);
  });

  after('waive all fees fines', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.selectAllFeeFines();
    waiveSelectedFeeFines(waiveReason);
  });

  after(() => {
    cy.wrap(testData).each((item) => {
      WaiveReasons.deleteViaApi(item.waiveReason.id);
      ManualCharges.deleteViaApi(item.feeFineType.id);
      UsersOwners.deleteViaApi(item.owner.id);
    });

    Users.deleteViaApi(user.id);
    PatronGroups.deleteViaApi(patronGroupId);
  });

  it('Scenario 3: The Waive button is grayed out on the All Fees/Fines page when one row box checked for a closed fee/fine', () => {
    UserAllFeesFines.goToAllFeeFines();
    UserAllFeesFines.clickRowCheckbox(0);
    UserAllFeesFines.checkWaiveButtonActive(false);
  });

  it('Scenario 6: When two row boxes checked for one closed fees/fines and one open fees/fines on the All Fees/Fines page open Waive Fee/Fine modal', () => {
    UserAllFeesFines.goToAllFeeFines();
    UserAllFeesFines.clickRowCheckbox(0);
    UserAllFeesFines.clickRowCheckbox(1);
    UserAllFeesFines.checkWaiveButtonActive(true);
    UserAllFeesFines.clickWaive();
    WaiveFeeFinesWarningModal.waitLoading();
    WaiveFeeFinesWarningModal.isConfirmActive(false);
    WaiveFeeFinesWarningModal.uncheckDeselectToContinue();
    WaiveFeeFinesWarningModal.isConfirmActive(true);
    WaiveFeeFinesWarningModal.cancel();
  });

  it('Scenario 9: The Waive button is grayed out on the All Fees/Fines page when waive ellipsis option clicked for a closed fee/fine', () => {
    UserAllFeesFines.goToAllFeeFines();
    UserAllFeesFines.checkWaiveEllipsisActive(0, false);
  });

  it('Scenario 13: When Waive Amount = null, zero, < 0 then display error message', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickWaiveEllipsis(0);
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.setWaiveAmount('0');
    WaiveFeeFinesModal.waiveAmountHasError('Amount must be positive');
  });

  it('Scenario 14: When Waive Amount > Selected Amount then display error message', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickWaiveEllipsis(0);
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.setWaiveAmount('5000');
    WaiveFeeFinesModal.waiveAmountHasError('Requested amount exceeds remaining amount');
  });

  it('Scenario 15: When Waive Amount < Selected Amount then what was originally a full waive becomes a partial waive', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickWaiveEllipsis(0);
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.setWaiveAmount('5');
    WaiveFeeFinesModal.checkPartialWaiveMessage(1, 5);
  });

  it('Scenario 16: Waive Reason not selected then Waive button is grayed out and unresponsive', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickWaiveEllipsis(0);
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.isConfirmDisabled(true);
  });

  it('Scenario 18: Cancel button clicked then go back to page user came from', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickWaiveEllipsis(0);
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.cancel();
    WaiveFeeFinesModal.isClosed();
  });
});
