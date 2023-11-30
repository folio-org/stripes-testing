import uuid from 'uuid';

import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import OverrideAndRenewModal from '../../support/fragments/users/loans/overrideAndRenewModal';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import { Permissions } from '../../support/dictionary';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import DateTools from '../../support/utils/dateTools';
import Checkout from '../../support/fragments/checkout/checkout';
import appPaths from '../../support/fragments/app-paths';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Loans', () => {
  describe('Loans: Renewals', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const nonLoanablePolicyBody = {
      id: uuid(),
      name: getTestEntityValue('nonLoanable'),
      loanable: false,
      renewable: false,
    };
    const firstItemBarcode = testData.folioInstances[0].barcodes[0];
    const secondItemBarcode = testData.folioInstances[1].barcodes[0];

    before('Create test data', () => {
      cy.getAdminToken();

      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      cy.createLoanType({
        name: getTestEntityValue('loan'),
      }).then((loanType) => {
        testData.loanTypeId = loanType.id;
        testData.folioInstances.forEach((item) => {
          cy.getItems({
            limit: 1,
            expandAll: true,
            query: `"barcode"=="${item.barcodes[0]}"`,
          }).then((res) => {
            res.permanentLoanType = { id: testData.loanTypeId };
            InventoryItems.editItemViaApi(res);
          });
        });
      });
      cy.createTempUser([Permissions.loansView.gui, Permissions.loansRenew.gui])
        .then((userProperties) => {
          testData.userA = userProperties;
        })
        .then(() => {
          cy.createTempUser([
            Permissions.loansView.gui,
            Permissions.loansRenew.gui,
            Permissions.loansRenewOverride.gui,
          ])
            .then((userProperties) => {
              testData.userB = userProperties;
            })
            .then(() => {
              UserEdit.addServicePointViaApi(
                testData.servicePoint.id,
                testData.userA.userId,
                testData.servicePoint.id,
              );
              UserEdit.addServicePointViaApi(
                testData.servicePoint.id,
                testData.userB.userId,
                testData.servicePoint.id,
              );
              LoanPolicy.createViaApi(nonLoanablePolicyBody);
              CirculationRules.addRuleViaApi(
                { t: testData.loanTypeId },
                { l: nonLoanablePolicyBody.id },
              ).then((newRule) => {
                testData.addedRule = newRule;
              });
              Checkout.checkoutThroughOverrideViaApi({
                itemBarcode: firstItemBarcode,
                servicePointId: testData.servicePoint.id,
                userBarcode: testData.userA.barcode,
              });
              Checkout.checkoutThroughOverrideViaApi({
                itemBarcode: secondItemBarcode,
                servicePointId: testData.servicePoint.id,
                userBarcode: testData.userB.barcode,
              });
            });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      cy.deleteLoanPolicy(nonLoanablePolicyBody.id);
      UserEdit.changeServicePointPreferenceViaApi(testData.userA.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(testData.userB.userId, [
        testData.servicePoint.id,
      ]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      testData.folioInstances.forEach((item) => {
        InventoryInstances.deleteInstanceViaApi({
          instance: item,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C15492 Renewal: failure because loan was not loanable (vega) (TaaS)',
      { tags: ['extendedPath', 'vega'] },
      () => {
        const firstItemInfo = {
          itemBarcode: firstItemBarcode,
          status: 'Item not renewed:item is not loanable, loan is not renewable',
        };
        const secondItemInfo = {
          itemBarcode: secondItemBarcode,
          status: 'Item not renewed:item is not loanable, loan is not renewable',
        };
        const loanDetails = {
          action: 'Renewed through override',
          dueDate: DateTools.getCurrentEndOfDay().add(1, 'day'),
          status: 'Checked out',
          source: testData.userB.lastName,
          comment: `autoTestText_${getRandomPostfix()}`,
        };
        // Log in as User A, and navigate to loan L. Renew loan L.
        cy.login(testData.userA.username, testData.userA.password, {
          path: appPaths.getOpenLoansPath(testData.userA.userId),
          waiter: LoanDetails.waitLoading,
        });
        UserLoans.openLoanDetails(firstItemBarcode);
        UserLoans.renewItem(firstItemBarcode, true);
        RenewConfirmationModal.verifyRenewConfirmationModal([firstItemInfo]);
        // Log in as User B, and navigate to loan L. Renew loan L.
        cy.login(testData.userB.username, testData.userB.password, {
          path: appPaths.getOpenLoansPath(testData.userB.userId),
          waiter: LoanDetails.waitLoading,
        });
        UserLoans.openLoanDetails(secondItemBarcode);
        UserLoans.renewItem(secondItemBarcode, true);
        RenewConfirmationModal.verifyRenewConfirmationModal([secondItemInfo], true);
        // Click override.
        RenewConfirmationModal.confirmRenewOverrideItem();
        OverrideAndRenewModal.verifyModalInfo([secondItemInfo]);
        // Enter required information, and check at least one loan.
        OverrideAndRenewModal.fillDateAndTime(loanDetails.dueDate.format('MM/DD/YYYY'));
        // Click override.
        OverrideAndRenewModal.confirmOverrideItem(loanDetails.comment);
        // Navigate to loan details.
        LoanDetails.checkLoanDetails(loanDetails);
      },
    );
  });
});
