import uuid from 'uuid';
import moment from 'moment/moment';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import UserEdit from '../../support/fragments/users/userEdit';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import WaiveFeeFineModal from '../../support/fragments/users/waiveFeeFineModal';

describe('Waive Fees/Fines', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    ownerData: {},
  };
  const feeFineType = {};
  let userData;
  let feeFineAccount;
  const waiveReason = WaiveReasons.getDefaultNewWaiveReason(uuid());

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
      .then(({ id, owner }) => {
        testData.ownerData.name = owner;
        testData.ownerData.id = id;
      })
      .then(() => {
        UsersOwners.addServicePointsViaApi(testData.ownerData, [testData.servicePoint]);
        ManualCharges.createViaApi({
          ...ManualCharges.defaultFeeFineType,
          ownerId: testData.ownerData.id,
        }).then((manualCharge) => {
          feeFineType.id = manualCharge.id;
          feeFineType.name = manualCharge.feeFineType;
          feeFineType.amount = manualCharge.amount;
        });
      });
    WaiveReasons.createViaApi(waiveReason);
    cy.createTempUser([
      Permissions.uiUsersView.gui,
      Permissions.uiUsersfeefinesView.gui,
      Permissions.uiUsersfeefinesCRUD.gui,
      Permissions.uiFeeFinesCanWaive.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
        feeFineAccount = {
          id: uuid(),
          ownerId: testData.ownerData.id,
          feeFineId: feeFineType.id,
          amount: 14,
          userId: userData.userId,
          feeFineType: feeFineType.name,
          feeFineOwner: testData.ownerData.name,
          createdAt: testData.servicePoint.id,
          dateAction: moment.utc().format(),
          source: 'ADMINISTRATOR, DIKU',
        };
        NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
          feeFineAccount.id = feeFineAccountId;
        });
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    WaiveReasons.deleteViaApi(waiveReason.id);
    ManualCharges.deleteViaApi(feeFineType.id);
    NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
    UsersOwners.deleteViaApi(testData.ownerData.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C464 Verify behavior when "Waive" button pressed from Fee/Fine Details page (Vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      // Go to User Information for your test patro
      UsersSearchPane.searchByKeywords(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      // Expand the Fees/Fines section to see details about the fees/fines owned by the patron, verifying that the count and amount of open fees/fines is correct (see attachment open-ff-section.JPG as an example)
      UsersCard.openFeeFines();
      // Click on the View all fees/fines link to open Fees/Fines History (aka Open/Closed/All Fees/Fines)
      UsersCard.viewAllFeesFines();
      UserAllFeesFines.clickOnRowByIndex(0);
      // Click the Waive option in the Actions menu
      UserAllFeesFines.waiveSelectedFeeFines();
      WaiveFeeFineModal.waitLoading();
      WaiveFeeFineModal.waiveModalIsExists();
    },
  );
});
