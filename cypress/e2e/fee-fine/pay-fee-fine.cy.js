import moment from 'moment/moment';
import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CommentRequired from '../../support/fragments/settings/users/comment-required';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFaine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Pay Fees/Fines', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    ownerData: {},
  };
  const feeFineType = {};
  const paymentMethod = {};
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
        ManualCharges.createViaApi({
          ...ManualCharges.defaultFeeFineType,
          ownerId: testData.ownerData.id,
        }).then((manualCharge) => {
          feeFineType.id = manualCharge.id;
          feeFineType.name = manualCharge.feeFineType;
          feeFineType.amount = manualCharge.amount;
        });
        PaymentMethods.createViaApi(testData.ownerData.id).then(({ name, id }) => {
          paymentMethod.name = name;
          paymentMethod.id = id;
        });
      });
    cy.createTempUser([
      Permissions.uiFeeFines.gui,
      Permissions.uiUsersManualPay.gui,
      Permissions.uiUsersfeefinesView.gui,
      Permissions.uiUsersSettingsAllFeeFinesRelated.gui,
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
    ManualCharges.deleteViaApi(feeFineType.id);
    PaymentMethods.deleteViaApi(paymentMethod.id);
    NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
    UsersOwners.deleteViaApi(testData.ownerData.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
    CommentRequired.turnOffCommentRequiredFlags();
  });

  it(
    'C456 Verify behavior when "Pay" button pressed from Fee/Fine History page with 1 fee/fine selected (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      // Go to User Information for your test patron
      UsersSearchPane.searchByKeywords(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      // Before expanding the Fees/Fines section, you should see a number representing the total number of outstanding fees/fines on the closed accordion (see attachment closed-ff-section.JPG as an example)
      // reload is needed, because sometimes it shows 0 Fees/Fines
      cy.reload();
      UsersCard.verifyFeesFinesCount('1');
      // Expand the Fees/Fines section to see details about the fees/fines owned by the patron, verifying that the count and amount of open fees/fines is correct (see attachment open-ff-section.JPG as an example)
      UsersCard.openFeeFines();
      // Click on the View all fees/fines link to open Fees/Fines History (aka Open/Closed/All Fees/Fines)
      UsersCard.viewAllFeesFines();
      // Place a check mark in the checkbox to the left of the row in Fees/Fines History that represents the Manual fee/fine charge you created
      UserAllFeesFines.clickRowCheckbox(0);
      // Choose Pay in the Actions menu
      UserAllFeesFines.paySelectedFeeFines();
      // The Pay fee/fine modal will open (as shown in attachment pay-ff-modal.JPG), with the Payment amount set to the total amount of the fee/fine you selected in step 5
      PayFeeFine.checkAmount(feeFineAccount.amount);
    },
  );

  it(
    'C457 Verify behavior when "Pay" ellipsis option selected from Fee/Fine History page (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      // Go to User Information for your test patron
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      // Before expanding the Fees/Fines section, you should see a number representing the total number of outstanding fees/fines on the closed accordion (see attachment closed-ff-section.JPG as an example)
      cy.reload();
      UsersCard.verifyFeesFinesCount('1');
      // Expand the Fees/Fines section to see details about the fees/fines owned by the patron, verifying that the count and amount of open fees/fines is correct (see attachment open-ff-section.JPG as an example)
      UsersCard.openFeeFines();
      UsersCard.verifyOpenedFeeFines(1, feeFineAccount.amount);
      // Click on the View all fees/fines link to open Fees/Fines History (aka Open/Closed/All Fees/Fines)
      UsersCard.viewAllFeesFines();
      // Click on the ellipsis option for the row in Fees/Fines History that represents the Manual fee/fine charge you created
      // Select Pay from the ellipsis menu
      UserAllFeesFines.clickPayEllipsis(0);
      // The Pay fee/fine modal will open (as shown in attachment pay-ff-modal.JPG), with the Payment amount set to the total amount of the fee/fine you selected in step 5.
      UserAllFeesFines.verifyPayModalIsOpen();
      PayFeeFine.checkAmount(feeFineAccount.amount);
    },
  );

  it(
    'C458 Verify behavior when "Pay" button pressed from Fee/Fine Details page (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      //  Go to User Information for your test patron
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      // Before expanding the Fees/Fines section, you should see a number representing the total number of outstanding fees/fines on the closed accordian (see attachment closed-ff-section.JPG as an example)
      cy.reload();
      UsersCard.verifyFeesFinesCount('1');
      // Expand the Fees/Fines section to see details about the fees/fines owned by the patron, verifying that the count and amount of open fees/fines is correct (see attachment open-ff-section.JPG as an example)
      UsersCard.openFeeFines();
      //  Click on the View all fees/fines link to open Fees/Fines History (aka Open/Closed/All Fees/Fines)
      UsersCard.viewAllFeesFines();
      // Click on the row in Fees/Fines History that represents the Manual fee/fine charge you created, which will open Fee/Fine Details
      UserAllFeesFines.clickOnRowByIndex(0);
      // Choose Pay in the Actions menu on the Fee/Fine Details page
      FeeFinesDetails.openActions();
      FeeFinesDetails.openPayModal();
      //  The Pay fee/fine modal will open (as shown in attachment pay-ff-modal.JPG), with the Payment amount set to the total amount of the fee/fine you selected in step 5
      PayFeeFine.checkAmount(feeFineAccount.amount);
    },
  );

  it(
    'C460 Verify "Pay fee/fine" behavior when comments not required (vega) (TaaS)',
    {
      tags: ['extendedPath', 'vega'],
    },
    () => {
      cy.visit(SettingsMenu.commentRequired);
      CommentRequired.requireCommentForPaidFeeChooseOption('No');
      // Go to user loans
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      // Find your active user's User Information
      UsersSearchPane.searchByKeywords(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      // Expand the Fees/Fines section
      UsersCard.openFeeFines();
      // Click on the View all fees/fines link to open Fees/Fines History (aka Open/Closed/All Fees/Fines)
      UsersCard.viewAllFeesFines();
      // Select Pay from the ellipsis menu of the row the fee/fine you charged is on
      UserAllFeesFines.clickRowCheckbox(0);
      UserAllFeesFines.paySelectedFeeFines();
      // The Pay fee/fine modal should open as shown in attached screen print pay-ff-modal-comment-not-required.JPG
      PayFeeFine.setAmount(10);
      // Select a Payment method and DO NOT enter Additional information for staff
      PayFeeFine.setPaymentMethod(paymentMethod);
      // Press the Pay button, then Confirm the payment
      PayFeeFine.submitAndConfirm();
      PayFeeFine.checkConfirmModalClosed();
    },
  );

  it(
    'C461 Verify "Pay fee/fine" behavior when "Require comment when fee/fine fully/partially paid" is set to Yes (vega) (TaaS)',
    {
      tags: ['extendedPath', 'vega'],
    },
    () => {
      cy.visit(SettingsMenu.commentRequired);
      CommentRequired.requireCommentForPaidFeeChooseOption('Yes');
      CommentRequired.clickSaveButton();
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      UsersCard.openFeeFines();
      UsersCard.viewAllFeesFines();
      UserAllFeesFines.clickRowCheckbox(0);
      UserAllFeesFines.paySelectedFeeFines();
      PayFeeFine.setAmount(10);
      PayFeeFine.setPaymentMethod(paymentMethod);
      PayFeeFine.verifySaveIsDisabled();
      PayFeeFine.fillInAdditionalInformation(getTestEntityValue('comment'));
      PayFeeFine.submitAndConfirm();
      PayFeeFine.checkConfirmModalClosed();
    },
  );
});
