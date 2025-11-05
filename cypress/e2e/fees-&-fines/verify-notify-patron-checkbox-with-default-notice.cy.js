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

describe('Check that Notify patron checkbox checked when fee/fine owner has default notice', () => {
  let userData = {};
  let servicePoint;
  let patronNoticeTemplate;
  let owner1Data;
  let owner2Data;
  let feeFineOwner1;
  let feeFineOwner2;
  let manualCharge1;
  let updatedCharge1;
  let manualCharge2;
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

        const templateData = PatronNoticeTemplates.getDefaultTemplate({
          category: { requestId: 'Manual Fee/fine charge' },
        });
        templateData.name = 'TestNoticeTemplate' + getRandomPostfix();
        templateData.header = 'Fee/Fine Charge Notice';
        templateData.body = 'You have been charged a fee/fine.';

        PatronNoticeTemplates.createViaApi(templateData);
      })
      .then((templateResponse) => {
        patronNoticeTemplate = templateResponse;

        cy.createTempUser(
          [
            Permissions.uiUsersfeefinesCRUD.gui,
            Permissions.uiUsersView.gui,
            Permissions.uiUsersSettingsOwners.gui,
            Permissions.uiUsersSettingsAllFeeFinesRelated.gui,
          ],
          patronGroup.name,
        );
      })
      .then((userProperties) => {
        userData = userProperties;

        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);

        // Create Owner 1 - without charge notice
        owner1Data = UsersOwners.getDefaultNewOwner({
          name: 'Owner1_WithoutNotice' + getRandomPostfix(),
        });
        UsersOwners.createViaApi(owner1Data);
      })
      .then((ownerResponse1) => {
        feeFineOwner1 = ownerResponse1;
        owner1Data.name = ownerResponse1.owner;
        UsersOwners.addServicePointsViaApi(owner1Data, [servicePoint]);

        // Create Owner 2 - with charge notice
        owner2Data = UsersOwners.getDefaultNewOwner({
          name: 'Owner2_WithNotice' + getRandomPostfix(),
        });
        UsersOwners.createViaApi(owner2Data);
      })
      .then((ownerResponse2) => {
        feeFineOwner2 = ownerResponse2;
        owner2Data.name = ownerResponse2.owner;
        UsersOwners.addServicePointsViaApi(owner2Data, [servicePoint]);

        // Owner 1 - no default charge notice initially
        const chargeData1 = {
          feeFineType: 'Type1_' + getRandomPostfix(),
          defaultAmount: 10.0,
          ownerId: feeFineOwner1.id,
          automatic: false,
        };
        ManualCharges.createViaApi(chargeData1);
      })
      .then((chargeResponse1) => {
        manualCharge1 = chargeResponse1;

        // Owner 2 - with charge notice for specific type
        const chargeData2 = {
          feeFineType: 'Type2_' + getRandomPostfix(),
          defaultAmount: 15.0,
          ownerId: feeFineOwner2.id,
          automatic: false,
          chargeNoticeId: patronNoticeTemplate.id,
        };
        ManualCharges.createViaApi(chargeData2);
      })
      .then((chargeResponse2) => {
        manualCharge2 = chargeResponse2;
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
    ManualCharges.deleteViaApi(manualCharge2.id);
    ManualCharges.deleteViaApi(updatedCharge1.id);
    PatronNoticeTemplates.deleteViaApi(patronNoticeTemplate.id);
    UsersOwners.deleteViaApi(feeFineOwner1.id);
    UsersOwners.deleteViaApi(feeFineOwner2.id);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C388523 Check that Notify patron checkbox checked when fee/fine owner has default notice (vega)',
    { tags: ['extendedPath', 'vega', 'C388523'] },
    () => {
      // Find and open user details page
      UsersSearchPane.searchByUsername(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();

      // Click on "Fees/fines" accordion > "Create fee/fine" button
      UsersCard.openFeeFines();
      UsersCard.startFeeFineAdding();
      NewFeeFine.waitLoading();

      // Choose "Owner 1" in "Fee/fine owner*" dropdown; "Type 1" in "Fee/fine type" dropdown
      NewFeeFine.setFeeFineOwner(feeFineOwner1.owner);
      NewFeeFine.setFeeFineType(manualCharge1.feeFineType);

      // "Notify patron" not appeared
      NewFeeFine.verifyNotifyPatronCheckboxNotPresent();

      // Choose "Owner 2" in "Fee/fine owner*" dropdown; "Type 2" in "Fee/fine type" dropdown
      NewFeeFine.setFeeFineOwner(feeFineOwner2.owner);
      NewFeeFine.setFeeFineType(manualCharge2.feeFineType);

      // "Notify patron" checkbox preselected
      NewFeeFine.verifyNotifyPatronCheckboxChecked();

      cy.getAdminToken()
        .then(() => {
          ManualCharges.deleteViaApi(manualCharge1?.id);
        })
        .then(() => {
          const updatedChargeData = {
            feeFineType: 'UpdatedType1_' + getRandomPostfix(),
            defaultAmount: 10.0,
            ownerId: feeFineOwner1.id,
            automatic: false,
            chargeNoticeId: patronNoticeTemplate.id,
          };
          return ManualCharges.createViaApi(updatedChargeData);
        })
        .then((updatedCharge) => {
          updatedCharge1 = updatedCharge;

          // Go back to "Users" app with found user
          cy.visit(TopMenu.usersPath);
          UsersSearchPane.waitLoading();
          UsersSearchPane.searchByUsername(userData.username);
          UsersSearchPane.selectUserFromList(userData.username);
          UsersCard.waitLoading();

          // Click on "Fees/fines" accordion > "Create fee/fine" button
          UsersCard.openFeeFines();
          UsersCard.startFeeFineAdding();
          NewFeeFine.waitLoading();

          // Choose "Owner 1" in "Fee/fine owner*" dropdown; updated charge type with notice
          NewFeeFine.setFeeFineOwner(feeFineOwner1.owner);
          NewFeeFine.setFeeFineType(updatedCharge1.feeFineType);

          // "Notify patron" checkbox preselected (now Owner 1 has updated charge with notice)
          NewFeeFine.verifyNotifyPatronCheckboxChecked();
        });
    },
  );
});
