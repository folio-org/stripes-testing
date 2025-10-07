import uuid from 'uuid';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import CommentRequired from '../../support/fragments/settings/users/comment-required';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import UsersCard from '../../support/fragments/users/usersCard';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import WaiveFeeFineModal from '../../support/fragments/users/waiveFeeFineModal';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Waive fee/fine with comment requirement', () => {
    const owner = UsersOwners.getDefaultNewOwner({ name: `owner-${uuid()}` });
    const waiveReason = WaiveReasons.getDefaultNewWaiveReason(uuid());
    let user;
    let ownerId;
    let servicePoint;
    let manualCharge;
    let waiveReasonId;
    let feeFineAccount;
    before('Preconditions: create owner, manual charge, waive reason, user with fee/fine', () => {
      cy.getAdminToken()
        .then(() => ServicePoints.getCircDesk1ServicePointViaApi())
        .then((circDesk1) => {
          servicePoint = circDesk1;
          UsersOwners.createViaApi(owner);
        })
        .then((ownerResponse) => {
          ownerId = ownerResponse.id;
          owner.name = ownerResponse.owner;
          UsersOwners.addServicePointsViaApi(owner, [servicePoint]);
        })
        .then(() => ManualCharges.createViaApi({ ...ManualCharges.defaultFeeFineType, ownerId }))
        .then((charge) => {
          manualCharge = charge;
          WaiveReasons.createViaApi(waiveReason);
        })
        .then((waiveReasonResponse) => {
          waiveReasonId = waiveReasonResponse.id;
          waiveReason.nameReason = waiveReasonResponse.nameReason;
        })
        .then(() => {
          // Set "Require comment when fee/fine fully/partially waived" to "Yes"
          CommentRequired.setWaivedCommentRequired();
        })
        .then(() => cy.createTempUser([Permissions.uiUsersfeefinesCRUD.gui]))
        .then((userProps) => {
          user = userProps;
          UserEdit.addServicePointViaApi(servicePoint.id, user.userId);
        })
        .then(() => {
          feeFineAccount = {
            id: uuid(),
            ownerId,
            feeFineId: manualCharge.id,
            amount: 50.0,
            userId: user.userId,
            feeFineType: manualCharge.feeFineType,
            feeFineOwner: owner.name,
            createdAt: servicePoint.id,
            dateAction: new Date().toISOString(),
          };
          NewFeeFine.createViaApi(feeFineAccount);
        })
        .then((feeFineAccountId) => {
          feeFineAccount.id = feeFineAccountId;
        })
        .then(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });

    after('Delete test data and restore settings', () => {
      cy.getAdminToken();
      CommentRequired.turnOffCommentRequiredFlags();
      Users.deleteViaApi(user.userId);
      NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
      UsersOwners.deleteViaApi(ownerId);
      ManualCharges.deleteViaApi(manualCharge.id);
      WaiveReasons.deleteViaApi(waiveReasonId);
    });

    it(
      'C467 Verify "Waive fee/fine" behavior when \'Require comment when fee/fine fully/partially waived\' is set to Yes (vega)',
      { tags: ['extendedPath', 'vega', 'C467'] },
      () => {
        // Step 1: Find active user's User Information/ Expand the Fees/Fines section
        UsersSearchPane.searchByKeywords(user.username);
        UsersCard.waitLoading();
        UsersCard.openFeeFines();

        // Click on the View all fees/fines link to open Fees/Fines History
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.verifyPageHeader(user.username);

        // Select Waive from the ellipsis menu
        UserAllFeesFines.waiveFeeFineByRowIndex(0);
        WaiveFeeFineModal.waitLoading();

        // Verify waive modal opens and check initial state
        WaiveFeeFineModal.waiveModalIsExists();
        WaiveFeeFineModal.verifyCommentRequired();
        WaiveFeeFineModal.selectWaiveReason(waiveReason.nameReason);

        // Test that waive button is disabled without comment
        WaiveFeeFineModal.isConfirmDisabled(true);

        // Now add the required comment
        const waiveComment = getTestEntityValue('Waive comment for C467');
        WaiveFeeFineModal.fillComment(waiveComment);

        // Now waive button should be enabled
        WaiveFeeFineModal.isConfirmDisabled(false);
        WaiveFeeFineModal.confirm();

        // Verify the waive was successful with comment
        UserAllFeesFines.goToClosedFeesFines();
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();
        FeeFineDetails.checkFeeFineLatestPaymentStatus('Waived fully');
        FeeFineDetails.verifyWaiveReasonInHistory(waiveReason.nameReason);
        FeeFineDetails.checkComment(waiveComment);
      },
    );
  });
});
