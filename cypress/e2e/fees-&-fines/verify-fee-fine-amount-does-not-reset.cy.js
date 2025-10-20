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

describe('Check that Fee/fine amount does not unexpectedly reset on manual charge form', () => {
  let userData = {};
  let servicePoint;
  let feeFineOwner;
  let ownerData;
  let manualCharge;
  const patronGroup = {
    name: 'groupFeeFine' + getRandomPostfix(),
  };
  const defaultAmount = '25.00';

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
          [Permissions.uiUsersfeefinesCRUD.gui, Permissions.uiUsersView.gui],
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
          feeFineType: 'ManualChargeAmountTest' + getRandomPostfix(),
          defaultAmount,
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
    'C354275 Check that Fee/fine amount does not unexpectedly reset on manual charge form (vega)',
    { tags: ['extendedPath', 'vega', 'C354275'] },
    () => {
      // Go to User app, find user from preconditions and open it
      UsersSearchPane.searchByUsername(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();

      // From the fees/fines accordion, click "Create fee/fine" button
      UsersCard.openFeeFines();
      UsersCard.startFeeFineAdding();
      NewFeeFine.waitLoading();

      // On the New fee/fine modal, select a fee/fine owner and fee/fine type from preconditions
      NewFeeFine.setFeeFineOwner(feeFineOwner.owner);
      NewFeeFine.verifyDefaultOwnerSelected(feeFineOwner.owner);
      NewFeeFine.setFeeFineType(manualCharge.feeFineType);

      // Verify fee/fine amount is pre-populated with default amount
      NewFeeFine.verifyAmountFieldValue(defaultAmount);

      // Click in the Fee/fine amount field
      NewFeeFine.clickAmountField();

      // Click on any inactive zone on the modal
      NewFeeFine.clickInactiveZone();

      // Verify the value in the Fee/fine amount field remains unchanged
      NewFeeFine.verifyAmountFieldValue(defaultAmount);
    },
  );
});
