import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import UsersCard from '../../support/fragments/users/usersCard';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import FeeFines from '../../support/fragments/users/feeFines';

describe('Fees&Fines', () => {
  describe('New fee/fine default owner behavior', () => {
    const ff1 = UsersOwners.getDefaultNewOwner({ name: `ff1-${uuid()}` });
    const ff2 = UsersOwners.getDefaultNewOwner({ name: `ff2-${uuid()}` });
    let user;
    let ff1Id;
    let ff2Id;
    let sp1;
    let sp2;
    let sp3;
    let manualCharge1;
    let manualCharge2;

    before('Preconditions: get service points, create owners, charges, user', () => {
      cy.getAdminToken()
        .then(() => ServicePoints.getCircDesk1ServicePointViaApi())
        .then((circDesk1) => {
          sp1 = circDesk1;
          ServicePoints.getCircDesk2ServicePointViaApi();
        })
        .then((circDesk2) => {
          sp2 = circDesk2;
          ServicePoints.getOnlineServicePointViaApi();
        })
        .then((online) => {
          sp3 = online;
          UsersOwners.createViaApi(ff1);
        })
        .then((ownerResponse) => {
          ff1Id = ownerResponse.id;
          ff1.name = ownerResponse.owner;
          UsersOwners.createViaApi(ff2);
        })
        .then((ownerResponse) => {
          ff2Id = ownerResponse.id;
          ff2.name = ownerResponse.owner;
        })
        .then(() => UsersOwners.addServicePointsViaApi(ff1, [sp1]))
        .then(() => UsersOwners.addServicePointsViaApi(ff2, [sp2]))
        .then(() => ManualCharges.createViaApi({ ...ManualCharges.defaultFeeFineType, ownerId: ff1Id }))
        .then((charge) => {
          manualCharge1 = charge;
          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            ownerId: ff2Id,
          });
        })
        .then((charge) => {
          manualCharge2 = charge;
        })
        .then(() => cy.createTempUser([Permissions.uiUsersfeefinesCRUD.gui], undefined))
        .then((userProps) => {
          user = userProps;
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      UsersOwners.deleteViaApi(ff1Id);
      UsersOwners.deleteViaApi(ff2Id);
      ManualCharges.deleteViaApi(manualCharge1.id);
      ManualCharges.deleteViaApi(manualCharge2.id);
    });

    it(
      'C452 Verify "New fee/fine" behavior when setting default fee/fine owner (vega)',
      { tags: ['extendedPath', 'vega', 'C452'] },
      () => {
        // Step 1: User has no service point, sees error
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });

        UsersSearchPane.searchByKeywords(user.username);
        UsersCard.waitLoading();
        UsersCard.openFeeFines();
        UsersCard.startFeeFineAdding();
        NewFeeFine.verifyAccessDeniedModal();

        // Step 2: Add service points to user, set sp1 as preference
        cy.getAdminToken().then(() => {
          UserEdit.addServicePointsViaApi([sp1.id, sp2.id, sp3.id], user.userId, sp1.id);
        });
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
        UsersSearchPane.searchByKeywords(user.username);
        UsersCard.waitLoading();

        // Step 3: User with sp1, default owner ff1 selected
        UsersCard.openFeeFines();
        UsersCard.startFeeFineAdding();
        NewFeeFine.verifyDefaultOwnerSelected(ff1.name);
        NewFeeFine.cancel();

        // Step 4: Switch to sp2, default owner ff2 selected
        NewFeeFine.switchServicePoint(ServicePoints.CIRC_DESK_2);
        FeeFines.closeFeeFine();
        UsersCard.waitLoading();
        UsersCard.openFeeFines();
        UsersCard.startFeeFineAdding();
        NewFeeFine.verifyDefaultOwnerSelected(ff2.name);
        NewFeeFine.cancel();

        // Step 5: Switch to sp3, no owner selected
        NewFeeFine.switchServicePoint(ServicePoints.ONLINE);
        FeeFines.closeFeeFine();
        UsersCard.waitLoading();
        UsersCard.openFeeFines();
        UsersCard.startFeeFineAdding();
        NewFeeFine.verifyNoOwnerSelected();
      },
    );
  });
});
