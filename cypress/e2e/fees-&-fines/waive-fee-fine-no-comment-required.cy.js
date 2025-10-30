import uuid from 'uuid';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import UsersCard from '../../support/fragments/users/usersCard';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import WaiveFeeFineModal from '../../support/fragments/users/waiveFeeFineModal';
import FeeFines from '../../support/fragments/users/feeFines';

describe('Fees&Fines', () => {
  describe('Waive fee/fine without comment requirement', () => {
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
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
      UsersOwners.deleteViaApi(ownerId);
      ManualCharges.deleteViaApi(manualCharge.id);
      WaiveReasons.deleteViaApi(waiveReasonId);
    });

    it(
      'C466 Verify "Waive fee/fine" behavior when \'Require comment when fee/fine fully/partially waived\' is set to No (vega)',
      { tags: ['extendedPath', 'vega', 'C466'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });

        UsersSearchPane.searchByKeywords(user.username);
        UsersCard.waitLoading();

        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();
        FeeFines.openFeeFine();

        FeeFineDetails.openActions();
        FeeFineDetails.openWaiveModal();

        WaiveFeeFineModal.waitLoading();
        WaiveFeeFineModal.waiveModalIsExists();
        WaiveFeeFineModal.selectWaiveReason(waiveReason.nameReason);

        WaiveFeeFineModal.submitWaive();
        WaiveFeeFineModal.confirmModalLoaded();
        WaiveFeeFineModal.confirm();

        // Verification: Check that the fee/fine was waived without comment
        FeeFineDetails.checkFeeFineLatestPaymentStatus('Waived fully');
        // Verify waive action appears in history without comment
        FeeFineDetails.verifyWaiveReasonInHistory(waiveReason.nameReason);
        FeeFineDetails.verifyNoCommentInHistory();
      },
    );
  });
});
