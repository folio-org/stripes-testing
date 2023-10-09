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

  it('Scenario 1: When no row box is checked  on the Open/All Fees/Fines page the Waive button is grayed out', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.checkRowsAreChecked(false);
    UserAllFeesFines.checkWaiveButtonActive(false);

    UserAllFeesFines.goToAllFeeFines();
    UserAllFeesFines.checkRowsAreChecked(false);
    UserAllFeesFines.checkWaiveButtonActive(false);
  });

  it('Scenario 2: When one row box checked on the Open Fees/Fines page open Waive Fee/Fine modal', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickRowCheckbox(0);
    UserAllFeesFines.checkWaiveButtonActive(true);
    UserAllFeesFines.clickWaive();
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.checkWaiveMessage(1, chargeAmount);

    WaiveFeeFinesModal.cancel();
  });

  it('Scenario 4: When one row box checked on the All Fees/Fines page open Waive Fee/Fine modal', () => {
    UserAllFeesFines.goToAllFeeFines();
    UserAllFeesFines.clickRowCheckbox(0);
    UserAllFeesFines.checkWaiveButtonActive(true);
    UserAllFeesFines.clickWaive();
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.checkWaiveMessage(1, chargeAmount);
    WaiveFeeFinesModal.cancel();
  });

  it('Scenario 5: When two row boxes checked on the Open Fees/Fines page open Waive Fee/Fine modal', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickRowCheckbox(0);
    UserAllFeesFines.clickRowCheckbox(1);
    UserAllFeesFines.checkWaiveButtonActive(true);
    UserAllFeesFines.clickWaive();
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.checkWaiveMessage(2, chargeAmount * 2);
    WaiveFeeFinesModal.cancel();
  });

  it('Scenario 7: When two row boxes checked on the All Fees/Fines page open Waive Fee/Fine modal', () => {
    UserAllFeesFines.goToAllFeeFines();
    UserAllFeesFines.clickRowCheckbox(0);
    UserAllFeesFines.clickRowCheckbox(1);
    UserAllFeesFines.checkWaiveButtonActive(true);
    UserAllFeesFines.clickWaive();
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.checkWaiveMessage(2, chargeAmount * 2);
    WaiveFeeFinesModal.cancel();
  });

  it('Scenario 8: When the Waive ellipsis option on the Open Fees/Fines page clicked open Waive Fee/Fine modal', () => {
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickWaiveEllipsis(0);
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.checkWaiveMessage(1, chargeAmount);
    WaiveFeeFinesModal.cancel();
  });

  it('Scenario 10: When the Waive ellipsis option on the All Fees/Fines page clicked open Waive Fee/Fine modal', () => {
    UserAllFeesFines.goToAllFeeFines();
    UserAllFeesFines.clickWaiveEllipsis(0);
    WaiveFeeFinesModal.waitLoading();
    WaiveFeeFinesModal.checkWaiveMessage(1, chargeAmount);
    WaiveFeeFinesModal.cancel();
  });
});
