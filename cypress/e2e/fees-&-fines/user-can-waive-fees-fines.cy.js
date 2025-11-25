import moment from 'moment/moment';
import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import TopMenu from '../../support/fragments/topMenu';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import WaiveFeeFineModal from '../../support/fragments/users/waiveFeeFineModal';

describe('Fees&Fines', () => {
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

      cy.createTempUser([Permissions.uiFeeFinesCanWaive.gui, Permissions.uiUsersfeefinesView.gui])
        .then((userProperties) => {
          userData = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
          cy.getAdminSourceRecord().then((adminSourceRecord) => {
            feeFineAccount = {
              id: uuid(),
              ownerId: testData.ownerData.id,
              feeFineId: feeFineType.id,
              amount: 30,
              userId: userData.userId,
              feeFineType: feeFineType.name,
              feeFineOwner: testData.ownerData.name,
              createdAt: testData.servicePoint.id,
              dateAction: moment.utc().format(),
              source: adminSourceRecord,
            };
            NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
              feeFineAccount.id = feeFineAccountId;
            });
          });
          cy.login(userData.username, userData.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      WaiveReasons.deleteViaApi(waiveReason.id);
      ManualCharges.deleteViaApi(feeFineType.id);
      NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
      UsersOwners.deleteViaApi(testData.ownerData.id);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C494014 Check that user with "Fees/Fines: Can waive" can waive fees/fines (vega)',
      { tags: ['extendedPath', 'vega', 'C494014'] },
      () => {
        // Step 1: Click on "Fees/fines" accordion > "# open fee/fine" button
        UsersSearchPane.searchByKeywords(userData.username);
        UsersSearchPane.selectUserFromList(userData.username);
        UsersCard.waitLoading();

        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.waitLoading();

        // Step 2: Select fee/fine record > click on "Actions" button > select "Waive" action
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFinesDetails.waitLoading();
        FeeFinesDetails.openActions();
        FeeFinesDetails.openWaiveModal();
        WaiveFeeFineModal.waitLoading();

        // Step 3: Select any "Waive reason" and click on "Waive" button
        WaiveFeeFineModal.selectWaiveReason(waiveReason.nameReason);

        // Step 4: Click on "Waive" button and then "Confirm" button
        WaiveFeeFineModal.confirm();
        FeeFinesDetails.checkFeeFineLatestPaymentStatus('Waived fully');
        FeeFinesDetails.checkFeeFineRemainingAmount('$0.00');
      },
    );
  });
});
