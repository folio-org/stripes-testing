import moment from 'moment/moment';
import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import TransferFeeFine from '../../support/fragments/users/transferFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Fees&Fines', () => {
  describe('Transfer Fees/Fines', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      ownerData: {},
      transferAccount: TransferAccounts.getDefaultNewTransferAccount(uuid()),
    };
    const feeFineType = {};
    let userData;
    let feeFineAccount;

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
          TransferAccounts.createViaApi({
            ...testData.transferAccount,
            ownerId: testData.ownerData.id,
          });
          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            ownerId: testData.ownerData.id,
          }).then((manualCharge) => {
            feeFineType.id = manualCharge.id;
            feeFineType.name = manualCharge.feeFineType;
            feeFineType.amount = manualCharge.amount;
          });
        });
      cy.createTempUser([
        Permissions.uiFeeFines.gui,
        Permissions.uiUsersfeefinesView.gui,
        Permissions.uiUserAccounts.gui,
      ])
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
              amount: 20,
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
      NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
      ManualCharges.deleteViaApi(feeFineType.id);
      TransferAccounts.deleteViaApi(testData.transferAccount.id);
      UsersOwners.deleteViaApi(testData.ownerData.id);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C5571 Verify behavior when "Transfer" button pressed from Fee/Fine History page with 1 fee/fine selected (vega)',
      { tags: ['extendedPath', 'vega', 'C5571'] },
      () => {
        // Step 1: Go to User Information for your test patron
        UsersSearchPane.searchByKeywords(userData.username);
        UsersSearchPane.selectUserFromList(userData.username);
        UsersCard.waitLoading();
        cy.reload();

        // Step 2: Before expanding the Fees/Fines section, verify number of outstanding fees/fines on closed accordion
        UsersCard.verifyFeesFinesCount('1');

        // Step 3: Expand the Fees/Fines section to see details about fees/fines owned by the patron
        UsersCard.openFeeFines();
        UsersCard.verifyOpenedFeeFines(1, feeFineAccount.amount);

        // Step 4: Click on the "View all fees/fines" link to open Fees/Fines History
        UsersCard.viewAllFeesFines();

        // Step 5: Select the fee/fine by clicking the checkbox
        UserAllFeesFines.clickRowCheckbox(0);

        // Step 6: Click the "Transfer" button from the Actions dropdown
        UserAllFeesFines.transferSelectedFeeFines();

        // Step 7: The Transfer fee/fine modal opens with the Transfer amount set to the total amount of the fee/fine
        TransferFeeFine.waitLoading();
        TransferFeeFine.checkAmount(feeFineAccount.amount);
      },
    );

    it(
      'C5573 Verify behavior when "Transfer" ellipsis option selected from Fee/Fine History page (vega)',
      { tags: ['extendedPath', 'vega', 'C5573'] },
      () => {
        // Step 1: Go to User Information for your test patron
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();
        UsersSearchPane.searchByKeywords(userData.username);
        UsersSearchPane.selectUserFromList(userData.username);
        UsersCard.waitLoading();

        // Step 2: Before expanding the Fees/Fines section, verify number of outstanding fees/fines on closed accordion
        UsersCard.verifyFeesFinesCount('1');

        // Step 3: Expand the Fees/Fines section to see details about fees/fines owned by the patron
        UsersCard.openFeeFines();
        UsersCard.verifyOpenedFeeFines(1, feeFineAccount.amount);

        // Step 4: Click on the "View all fees/fines" link to open Fees/Fines History
        UsersCard.showOpenedFeeFines();
        UserAllFeesFines.verifyPageHeader(userData.username);

        // Step 5-6: Click ellipsis for the fee/fine row and select Transfer option
        UserAllFeesFines.clickTransferEllipsis(0);

        // Step 7: The Transfer fee/fine modal opens with the Transfer amount set to the total amount of the fee/fine
        TransferFeeFine.waitLoading();
        TransferFeeFine.checkAmount(feeFineAccount.amount);
      },
    );

    it(
      'C5574 Verify behavior when "Transfer" button pressed from Fee/Fine Details page (vega)',
      { tags: ['extendedPath', 'vega', 'C5574'] },
      () => {
        // Step 1: Go to User Information for your test patron
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();
        UsersSearchPane.searchByKeywords(userData.username);
        UsersSearchPane.selectUserFromList(userData.username);
        UsersCard.waitLoading();

        // Step 2: Before expanding the Fees/Fines section, verify number of outstanding fees/fines on closed accordion
        UsersCard.verifyFeesFinesCount('1');

        // Step 3: Expand the Fees/Fines section to see details about fees/fines owned by the patron
        UsersCard.openFeeFines();
        UsersCard.verifyOpenedFeeFines(1, feeFineAccount.amount);

        // Step 4: Click on the "View all fees/fines" link to open Fees/Fines History
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.verifyPageHeader(userData.username);

        // Step 5: Click on the row in Fees/Fines History to open Fee/Fine Details
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();

        // Step 6: In the Actions menu, choose the Transfer option on the Fee/Fine Details page
        FeeFineDetails.openActions();
        FeeFineDetails.openTransferModal();

        // Step 7: The Transfer fee/fine modal opens with the Transfer amount set to the total amount of the fee/fine
        TransferFeeFine.waitLoading();
        TransferFeeFine.checkAmount(feeFineAccount.amount);
      },
    );
  });
});
