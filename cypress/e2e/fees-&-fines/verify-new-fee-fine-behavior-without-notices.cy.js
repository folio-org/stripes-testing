import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Verify "New fee/fine" behavior when fee/fine owner does not have default or fee/fine type action notice set', () => {
  let userData = {};
  let servicePoint;
  let feeFineOwner;
  let ownerData;
  let manualCharge;
  const patronGroup = {
    name: 'groupFeeFine' + getRandomPostfix(),
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.getCircDesk1ServicePointViaApi();
      })
      .then((sp) => {
        servicePoint = sp;
        PatronGroups.createViaApi(patronGroup.name);
      })
      .then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;

        cy.createTempUser(
          [
            Permissions.uiUsersfeefinesCRUD.gui,
            Permissions.uiUsersfeefinesView.gui,
            Permissions.uiFeeFinesActions.gui,
            Permissions.uiUsersView.gui,
          ],
          patronGroup.name,
        );
      })
      .then((userProperties) => {
        userData = userProperties;

        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);

        ownerData = UsersOwners.getDefaultNewOwner({
          name: 'TestOwner' + getRandomPostfix(),
        });

        UsersOwners.createViaApi(ownerData);
      })
      .then((ownerResponse) => {
        feeFineOwner = ownerResponse;
        ownerData.name = ownerResponse.owner;
        UsersOwners.addServicePointsViaApi(ownerData, [servicePoint]);
      })
      .then(() => {
        const chargeData = {
          feeFineType: 'ManualChargeWithoutNotice' + getRandomPostfix(),
          defaultAmount: 10.0,
          ownerId: feeFineOwner.id,
          automatic: false,
        };

        ManualCharges.createViaApi(chargeData);
      })
      .then((chargeResponse) => {
        manualCharge = chargeResponse;
      })
      .then(() => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    ManualCharges.deleteViaApi(manualCharge.id);
    UsersOwners.deleteViaApi(feeFineOwner.id);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C6647 Verify "New fee/fine" behavior when fee/fine owner does not have default or fee/fine type action notice set (vega)',
    { tags: ['extendedPath', 'vega', 'C6647'] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();

      // Expand the Fees/Fines accordion and click on "Create fee/fine" button
      UsersCard.openFeeFines();
      UsersCard.startFeeFineAdding();
      NewFeeFine.waitLoading();

      // Select Fee/Fine Owner (from preconditions) from the Fee/fine owner dropdown
      NewFeeFine.setFeeFineOwner(feeFineOwner.owner);
      NewFeeFine.verifyDefaultOwnerSelected(feeFineOwner.owner);

      // From the Fee/fine type dropdown select the first Manual charge from preconditions
      NewFeeFine.setFeeFineType(manualCharge.feeFineType);

      // Verify New fee/fine page NOT included a "Notify patron" checkbox when no notices are configured
      NewFeeFine.verifyNotifyPatronCheckboxNotPresent();
    },
  );
});
