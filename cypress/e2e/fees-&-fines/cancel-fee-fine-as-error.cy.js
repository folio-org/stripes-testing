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
  describe('Cancel Fee/Fine as Error', () => {
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
                UsersCard.openFeeFines();
                UsersCard.startFeeFineAdding();
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
      'C470 Cancel fee/fine as error from History page and verify cancellation details',
      { tags: ['extendedPath', 'vega', 'C470'] },
      () => {
        // Navigate to user's Fees/Fines page
        UsersCard.openFeeFines();
        UsersCard.verifyOpenedFeeFines(1, feeFineType.amount);

        // Click on "open fee/fine" link to go to History page
        UsersCard.showOpenedFeeFines();
        UserAllFeesFines.verifyPageHeader(testData.user.username);

        // Select the fee/fine and cancel as error from History page
        UserAllFeesFines.cancelSelectedFeeFines(0);
        CancelFeeFine.waitLoading();

        // Verify cancel modal content and fee/fine information display
        CancelFeeFine.verifyModalContent(feeFineType.amount, feeFineType.feeFineType);

        // Test Back button - close modal without changes
        CancelFeeFine.clickBack();
        UserAllFeesFines.verifyPageHeader(testData.user.username); // Verify we're back on History page

        // Reopen modal for continuation of test
        UserAllFeesFines.cancelSelectedFeeFines(0);
        CancelFeeFine.waitLoading();

        // Fill comment and verify successful cancellation
        const cancelComment = getTestEntityValue('Cancel as error comment from History');
        CancelFeeFine.verifyCommentError();
        CancelFeeFine.fillInAdditionalInformationAndConfirm(cancelComment);

        // Verify the fee/fine is moved to Closed tab with "Cancelled as error" status
        UserAllFeesFines.goToClosedFeesFines();
        UserAllFeesFines.verifyPaymentStatus(0, 'Cancelled as error');

        // Click on the cancelled fee/fine to view details
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();

        // Verify fee/fine details show cancelled status and comment
        FeeFineDetails.checkFeeFineLatestPaymentStatus('Cancelled as error');
        FeeFineDetails.checkComment(cancelComment);
      },
    );

    it(
      'C470 Cancel fee/fine as error from Details page and verify cancellation information',
      { tags: ['extendedPath', 'vega', 'C470'] },
      () => {
        // Navigate to Fees/Fines page
        UsersCard.openFeeFines();
        UsersCard.verifyOpenedFeeFines(1, feeFineType.amount);

        // Click on the fee/fine amount to go to Details page
        UsersCard.showOpenedFeeFines();
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();

        // Actions > Error from Details page - open modal
        FeeFineDetails.openActions();
        FeeFineDetails.openErrorModal();
        CancelFeeFine.waitLoading();

        // Verify modal content from Details page
        CancelFeeFine.verifyModalContent(feeFineType.amount, feeFineType.feeFineType);

        // Scenario 4: Test Back button from Details page
        CancelFeeFine.clickBack();
        FeeFineDetails.waitLoading();

        // Scenario 5 & 6: Complete cancellation with validation
        const cancelComment = getTestEntityValue('Cancel as error comment from Details');
        FeeFineDetails.cancelAsError(cancelComment);
        FeeFineDetails.closeDetails();

        // Verify we're back on History page and fee/fine is in Closed tab
        UserAllFeesFines.verifyPageHeader(testData.user.username);
        UserAllFeesFines.goToClosedFeesFines();
        UserAllFeesFines.verifyPaymentStatus(0, 'Cancelled as error');

        // Verify details still show correct cancellation information
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();
        FeeFineDetails.checkFeeFineLatestPaymentStatus('Cancelled as error');
        FeeFineDetails.checkComment(cancelComment);
      },
    );
  });
});
