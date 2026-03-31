import uuid from 'uuid';

import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LostItemFeePolicy from '../../support/fragments/circulation/lost-item-fee-policy';
import OverdueFinePolicy from '../../support/fragments/circulation/overdue-fine-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LoansPage from '../../support/fragments/loans/loansPage';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Loans', () => {
  describe('Loans: Loan Details', () => {
    const testData = {};
    const overdueFinePolicyBody = {
      id: uuid(),
      name: getTestEntityValue('overdueC9283'),
      description: 'Overdue fine policy for C9283',
      countClosed: true,
      forgiveOverdueFine: true,
      gracePeriodRecall: true,
      maxOverdueFine: '0.00',
      maxOverdueRecallFine: '0.00',
    };
    const lostItemFeePolicyBody = {
      id: uuid(),
      name: getTestEntityValue('lostC9283'),
      description: 'Lost item fee policy for C9283',
      chargeAmountItem: {
        amount: '0.00',
        chargeType: 'anotherCost',
      },
      lostItemProcessingFee: '0.00',
      chargeAmountItemPatron: false,
      chargeAmountItemSystem: false,
      returnedLostItemProcessingFee: false,
      replacedLostItemProcessingFee: false,
      replacementProcessingFee: '0.00',
      replacementAllowed: false,
      lostItemReturned: 'Charge',
      lostItemChargeFeeFine: {
        duration: 1,
        intervalId: 'Days',
      },
    };
    let userData;
    let materialTypeId;

    before('Create test data', () => {
      cy.getAdminToken();

      testData.servicePoint = ServicePoints.getDefaultServicePoint();
      testData.folioInstances = InventoryInstances.generateFolioInstances();

      ServicePoints.createViaApi(testData.servicePoint);
      cy.getLocations({ limit: 1 }).then((location) => {
        testData.defaultLocation = location;
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });

      cy.getBookMaterialType().then((materialType) => {
        materialTypeId = materialType.id;
      });

      OverdueFinePolicy.createViaApi(overdueFinePolicyBody);
      LostItemFeePolicy.createViaApi(lostItemFeePolicyBody);

      cy.then(() => {
        CirculationRules.addRuleViaApi(
          { m: materialTypeId },
          {
            o: overdueFinePolicyBody.id,
            i: lostItemFeePolicyBody.id,
          },
        ).then((newRule) => {
          testData.addedRule = newRule;
        });
      });

      cy.createTempUser([
        Permissions.uiUsersView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiCirculationSettingsOverdueFinesPolicies.gui,
        Permissions.uiCirculationSettingsLostItemFeesPolicies.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          userData.userId,
          testData.servicePoint.id,
        );

        Checkout.checkoutItemViaApi({
          itemBarcode: testData.folioInstances[0].barcodes[0],
          servicePointId: testData.servicePoint.id,
          userBarcode: userData.barcode,
        });

        cy.login(userData.username, userData.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.folioInstances[0].barcodes[0],
        servicePointId: testData.servicePoint.id,
      });
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(userData.userId);
      OverdueFinePolicy.deleteViaApi(overdueFinePolicyBody.id);
      LostItemFeePolicy.deleteViaApi(lostItemFeePolicyBody.id);
    });

    it(
      'C9283 Verify that Loan Details links to Overdue Fine Policy and Lost Item Fee Policy work (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C9283'] },
      () => {
        const itemBarcode = testData.folioInstances[0].barcodes[0];

        // Navigate to Users app and search for the user
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();
        UsersSearchPane.searchByKeywords(userData.username);
        UsersSearchPane.openUser(userData.userId);
        UsersCard.viewCurrentLoans();
        UserLoans.openLoanDetails(itemBarcode);

        // Verify Overdue Fine Policy link exists and redirects to correct page
        LoansPage.verifyLinkRedirectsCorrectPage({
          href: '/settings/circulation/fine-policies',
          expectedPage: 'Overdue fine policies',
        });

        // Navigate back to Users app
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();
        UsersSearchPane.searchByKeywords(userData.username);
        UsersSearchPane.openUser(userData.userId);
        UsersCard.viewCurrentLoans();
        UserLoans.openLoanDetails(itemBarcode);

        // Verify Lost Item Fee Policy link exists and redirects to correct page
        LoansPage.verifyLinkRedirectsCorrectPage({
          href: '/settings/circulation/lost-item-fee-policy',
          expectedPage: 'Lost item fee policies',
        });
      },
    );
  });
});
