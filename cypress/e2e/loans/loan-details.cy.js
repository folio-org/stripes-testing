import uuid from 'uuid';

import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { REQUEST_TYPES, REQUEST_LEVELS, FULFILMENT_PREFERENCES } from '../../support/constants';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import Checkout from '../../support/fragments/checkout/checkout';
import Requests from '../../support/fragments/requests/requests';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import AppPaths from '../../support/fragments/app-paths';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoansPage from '../../support/fragments/loans/loansPage';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import PayFeeFine from '../../support/fragments/users/payFeeFaine';

describe('Loan Details', () => {
  const feeFineType = {};
  const ownerData = {};
  const patronGroup = {
    name: getTestEntityValue('GroupCircLog'),
  };
  let userData;
  let userForRequest;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.RECALL],
    name: getTestEntityValue('recallForCL'),
    id: uuid(),
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Location.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
    });

    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    RequestPolicy.createViaApi(requestPolicyBody);

    UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
      .then(({ id, owner }) => {
        ownerData.id = id;
        ownerData.name = owner;
      })
      .then(() => {
        PaymentMethods.createViaApi(ownerData.id).then((paymentMethodRes) => {
          testData.paymentMethod = paymentMethodRes;
        });
        UsersOwners.addServicePointsViaApi(ownerData, [testData.servicePoint]);
        ManualCharges.createViaApi({
          ...ManualCharges.defaultFeeFineType,
          ownerId: ownerData.id,
        }).then((manualCharge) => {
          feeFineType.id = manualCharge.id;
          feeFineType.name = manualCharge.feeFineType;
          feeFineType.amount = manualCharge.amount;
        });
      });

    cy.createTempUser(
      [
        Permissions.requestsAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.settingsLoanPoliciesAll.gui,
        Permissions.uiFeeFines.gui,
        Permissions.uiUsersfeefinesView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiUsersViewAllSettings.gui,
        Permissions.uiCirculationSettingsOverdueFinesPolicies.gui,
        Permissions.uiCirculationSettingsLostItemFeesPolicies.gui,
      ],
      patronGroup.name,
    )
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);

        cy.createTempUser([Permissions.requestsAll.gui], patronGroup.name).then(
          (userProperties) => {
            userForRequest = userProperties;
            UserEdit.addServicePointViaApi(testData.servicePoint.id, userForRequest.userId);

            Checkout.checkoutItemViaApi({
              itemBarcode: testData.folioInstances[0].barcodes[0],
              servicePointId: testData.servicePoint.id,
              userBarcode: userData.barcode,
            }).then((checkoutResponse) => {
              Requests.createNewRequestViaApi({
                fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
                holdingsRecordId: testData.folioInstances[0].holdingId,
                instanceId: testData.folioInstances[0].instanceId,
                item: { barcode: testData.folioInstances[0].barcodes[0] },
                itemId: checkoutResponse.itemId,
                pickupServicePointId: testData.servicePoint.id,
                requestDate: new Date(),
                requestExpirationDate: new Date(new Date().getTime() + 86400000),
                requestLevel: REQUEST_LEVELS.ITEM,
                requestType: REQUEST_TYPES.RECALL,
                requesterId: userForRequest.userId,
              }).then((request) => {
                testData.requestsId = request.body.id;
              });
            });
          },
        );

        cy.login(userData.username, userData.password);
      });
  });

  after('Delete test data', () => {
    Requests.deleteRequestViaApi(testData.requestsId);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userForRequest.userId, [testData.servicePoint.id]);
    PaymentMethods.deleteViaApi(testData.paymentMethod.id);
    ManualCharges.deleteViaApi(feeFineType.id);
    UsersOwners.deleteViaApi(ownerData.id);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    testData.folioInstances.forEach((item) => {
      InventoryInstances.deleteInstanceViaApi({
        instance: item,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
    });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    Users.deleteViaApi(userForRequest.userId);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C561 Loan details: test links (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      const itemBarcode = testData.folioInstances[0].barcodes[0];
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      UserLoans.createNewFeeFine(itemBarcode, ownerData.name, feeFineType.name);

      // Click linked value for item title
      UserLoans.openLoanDetails(itemBarcode);
      LoansPage.verifyLinkRedirectsCorrectPage({
        title: testData.folioInstances[0].instanceTitle,
        expectedPage: 'Instance',
      });

      // Click linked value for barcode
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      UserLoans.openLoanDetails(itemBarcode);
      LoansPage.verifyLinkRedirectsCorrectPage({
        title: itemBarcode,
        expectedPage: 'Item',
      });

      // Click linked value for Loan policy
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      UserLoans.openLoanDetails(itemBarcode);
      LoansPage.verifyLinkRedirectsCorrectPage({
        href: '/settings/circulation/loan-policies',
        expectedPage: 'Loan policies',
      });

      // Click on linked value for Fine incurred
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      UserLoans.openLoanDetails(itemBarcode);
      LoansPage.verifyButtonRedirectsToCorrectPage({
        title: '100.00',
        expectedPage: 'Fee/fine details',
      });

      // Add another fee/fine to loan and click linked value for Fine incurred
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      UserLoans.createNewFeeFine(itemBarcode, ownerData.name, feeFineType.name);
      UserLoans.openLoanDetails(itemBarcode);
      LoansPage.verifyButtonRedirectsToCorrectPage({
        title: '200.00',
        expectedPage: 'Fees/fines',
      });

      // Pay fee fines
      UserAllFeesFines.goToOpenFeeFines();
      UserAllFeesFines.selectAllFeeFines();
      FeeFinesDetails.openActions().then(() => {
        FeeFinesDetails.openPayModal();
      });
      PayFeeFine.checkAmount(200);
      PayFeeFine.setPaymentMethod(testData.paymentMethod);
      PayFeeFine.setAmount(200);
      PayFeeFine.checkRestOfPay(200);
      PayFeeFine.submitAndConfirm();
      PayFeeFine.checkConfirmModalClosed();

      // Click on linked value for overdue policy
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      UserLoans.openLoanDetails(itemBarcode);
      LoansPage.verifyLinkRedirectsCorrectPage({
        href: '/settings/circulation/fine-policies',
        expectedPage: 'Overdue fine policies',
      });

      // Click on linked value for lost item policy
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      UserLoans.openLoanDetails(itemBarcode);
      LoansPage.verifyLinkRedirectsCorrectPage({
        href: '/settings/circulation/lost-item-fee-policy',
        expectedPage: 'Lost item fee policies',
      });

      // Click on linked value for Request queue
      cy.visit(AppPaths.getOpenLoansPath(userData.userId));
      UserLoans.openLoanDetails(itemBarcode);
      LoansPage.verifyLinkRedirectsCorrectPage({ href: '/requests?', expectedPage: 'Requests' });
    },
  );
});
