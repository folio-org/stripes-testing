import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import CancelFeeFine from '../../support/fragments/users/cancelFeeFine';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import Permissions from '../../support/dictionary/permissions';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UsersCard from '../../support/fragments/users/usersCard';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';

describe('Fees&Fines', () => {
  describe('Cancel Fee/Fine', () => {
    const testData = {};
    const feeFineType = {};
    const ownerBody = {
      owner: 'AutotestOwner' + getRandomPostfix(),
      servicePointOwner: [],
    };

    beforeEach('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        testData.servicePoint = servicePoint;

        ownerBody.servicePointOwner = [
          {
            value: testData.servicePoint.id,
            label: testData.servicePoint.name,
          },
        ];

        UsersOwners.createViaApi(ownerBody).then((ownerResponse) => {
          testData.ownerId = ownerResponse.id;
          testData.owner = ownerResponse.owner;

          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            ownerId: testData.ownerId,
          }).then((manualCharge) => {
            feeFineType.id = manualCharge.id;
            feeFineType.amount = manualCharge.amount;
            feeFineType.feeFineType = manualCharge.feeFineType;

            cy.createTempUser([
              Permissions.loansAll.gui,
              Permissions.loansView.gui,
              Permissions.loansRenewOverride.gui,
              Permissions.loansRenew.gui,
              Permissions.uiFeeFines.gui,
              Permissions.uiUsersfeefinesView.gui,
              Permissions.uiUsersView.gui,
            ])
              .then((userProperties) => {
                testData.user = userProperties;
              })
              .then(() => {
                UserEdit.addServicePointViaApi(
                  testData.servicePoint.id,
                  testData.user.userId,
                  testData.servicePoint.id,
                );

                cy.waitForAuthRefresh(() => {
                  cy.login(testData.user.username, testData.user.password, {
                    path: TopMenu.usersPath,
                    waiter: UsersSearchPane.waitLoading,
                  });
                });
                UsersSearchPane.searchByKeywords(testData.user.username);
                UsersSearchPane.openUser(testData.user.username);
                UsersCard.waitLoading();
                UsersCard.openFeeFines();
                UsersCard.startFeeFineAdding();
                NewFeeFine.waitLoading();
                NewFeeFine.setFeeFineOwner(ownerBody.owner);
                NewFeeFine.checkFilteredFeeFineType(feeFineType.feeFineType);
                NewFeeFine.setFeeFineType(feeFineType.feeFineType);
                NewFeeFine.chargeOnly();
                UsersSearchPane.waitLoading();
              });
          });
        });
      });
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      ManualCharges.deleteViaApi(feeFineType.id);
      UsersOwners.deleteViaApi(testData.ownerId);
    });

    it(
      'C469 Verify behavior when "Error" button pressed from Fee/Fine Details page (vega)',
      { tags: ['extendedPath', 'vega', 'C469'] },
      () => {
        // Step 2: Verify count on closed accordion (badge)
        UsersCard.verifyFeesFinesCount('1');

        // Step 3: Expand Fees/Fines section and verify details
        UsersCard.openFeeFines();
        UsersCard.verifyOpenedFeeFines(1, feeFineType.amount);

        // Step 4: Click "View all fees/fines" link to open Fees/Fines History
        UsersCard.showOpenedFeeFines();
        UserAllFeesFines.verifyPageHeader(testData.user.username);

        // Step 5: Click on fee/fine row to open Fee/Fine Details
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();

        // Step 6: Choose Error option from Actions menu
        FeeFineDetails.openActions();
        FeeFineDetails.openErrorModal();
        CancelFeeFine.waitLoading();

        // Step 7: Verify Confirm fee/fine cancellation modal
        CancelFeeFine.verifyModalContent(feeFineType.amount, feeFineType.feeFineType);

        // Step 8: Verify comment is required
        CancelFeeFine.verifyCommentError();

        // Step 9a: Test Back button - modal closes without changes
        CancelFeeFine.clickBack();
        FeeFineDetails.waitLoading();

        // Step 9b: Reopen modal and complete cancellation
        FeeFineDetails.openActions();
        FeeFineDetails.openErrorModal();
        CancelFeeFine.waitLoading();

        const cancelComment = getTestEntityValue('Cancel as error - Additional information');
        CancelFeeFine.confirmCancellation(cancelComment);

        // Close Details page to return to Fees/Fines History page
        FeeFineDetails.closeDetails();
        UserAllFeesFines.verifyPageHeader(testData.user.username);
        UserAllFeesFines.goToClosedFeesFines();
        UserAllFeesFines.verifyPaymentStatus(0, 'Cancelled as error');

        // Verify cancellation details including staff comment
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();

        FeeFineDetails.checkFeeFineLatestPaymentStatus('Cancelled as error');
        FeeFineDetails.checkComment(cancelComment);
      },
    );
  });
});
