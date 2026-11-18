import uuid from 'uuid';

import { Permissions } from '../../support/dictionary';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import { default as LoanPolicy, default as LoanPolicyActions } from '../../support/fragments/circulation/loan-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import Loans from '../../support/fragments/users/userDefaultObjects/loans';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Loans', () => {
  describe('Loans: Renewals', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const loanPolicyData = {
      id: uuid(),
      name: `Test loan policy C580 ${getTestEntityValue()}`,
    };
    let itemBarcode;

    before('Create test data', () => {
      cy.getAdminToken();

      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
      Location.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      itemBarcode = testData.folioInstances[0].barcodes[0];
      cy.createLoanType({
        name: getTestEntityValue('feeFine'),
      })
        .then((loanType) => {
          testData.loanTypeId = loanType.id;
        })
        .then(() => {
          LoanPolicyActions.createRenewableLoanPolicyApi(loanPolicyData);
          CirculationRules.addRuleViaApi({ t: testData.loanTypeId }, { l: loanPolicyData.id }).then(
            (newRule) => {
              testData.addedRule = newRule;
            },
          );
        });
      cy.createTempUser([Permissions.loansView.gui, Permissions.loansRenew.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.user.userId);
          Checkout.checkoutItemViaApi({
            itemBarcode,
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.user.barcode,
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.usersPath,
              waiter: UsersSearchPane.waitLoading,
            });
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(testData.addedRule);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
      cy.deleteLoanType(testData.loanTypeId);
      if (testData.loanPolicy && testData.loanPolicy.id) {
        LoanPolicy.deleteApi(testData.loanPolicy.id);
      }
    });

    it(
      'C580 Renewal: success, from loan details (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C580'] },
      () => {
        // #1 Go to Users app. Find user with open loan. Click on "x open loan(s)" to open loans table.
        UsersSearchPane.searchByKeywords(testData.user.username);
        UsersSearchPane.openUser(testData.user.username);
        UsersCard.waitLoading();
        UsersCard.viewCurrentLoans();
        UserLoans.openLoanDetails(itemBarcode);
        // #2 Click "Renew" button.
        UserLoans.renewItem(itemBarcode, true);
        LoanDetails.checkAction(0, 'Renewed');
        LoanDetails.checkRenewalCount();
        Loans.getApi(testData.user.userId).then(([loan]) => {
          cy.getLoanHistory(loan.id).then(([renewedAction]) => {
            LoanDetails.checkDueDate(0, renewedAction.loan.dueDate);
          });
        });
      }
    );
  });
});
