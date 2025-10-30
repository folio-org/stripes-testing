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
import PatronNoticeTemplates from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Verify "New fee/fine" behavior when fee/fine owner has charge notice set for fee/fine type', () => {
  let userData = {};
  let servicePoint;
  let feeFineOwner;
  let ownerData;
  let patronNoticeTemplate;
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
        const templateData = PatronNoticeTemplates.getDefaultTemplate({
          category: { requestId: 'Fee/fine charge' },
        });
        templateData.name = 'TestNoticeTemplate' + getRandomPostfix();
        templateData.header = 'Fee/Fine Charge Notice';
        templateData.body = 'You have been charged a fee/fine.';

        PatronNoticeTemplates.createViaApi(templateData);
      })
      .then((templateResponse) => {
        patronNoticeTemplate = templateResponse;

        const chargeData = {
          feeFineType: 'ManualChargeWithTypeNotice' + getRandomPostfix(),
          defaultAmount: 10.0,
          ownerId: feeFineOwner.id,
          automatic: false,
          chargeNoticeId: patronNoticeTemplate.id,
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
    PatronNoticeTemplates.deleteViaApi(patronNoticeTemplate.id);
    UsersOwners.deleteViaApi(feeFineOwner.id);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C5562 Verify "New fee/fine" behavior when fee/fine owner has charge notice set for fee/fine type (vega)',
    { tags: ['extendedPath', 'vega', 'C5562'] },
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

      // Verify New fee/fine page includes checked "Notify patron checkbox" when fee/fine type has charge notice
      NewFeeFine.verifyNotifyPatronCheckboxChecked();
    },
  );
});
