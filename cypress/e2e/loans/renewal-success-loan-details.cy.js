import uuid from 'uuid';

import { getTestEntityValue } from '../../support/utils/stringTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LoanPolicyActions from '../../support/fragments/circulation/loan-policy';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import { Permissions } from '../../support/dictionary';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UsersCard from '../../support/fragments/users/usersCard';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Loans', () => {
  describe('Loans: Renewals', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const loanPolicyId = uuid();
    const loanPolicyData = {
      id: loanPolicyId,
      name: `Test loan policy ${loanPolicyId}`,
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
          CirculationRules.addRuleViaApi({ t: testData.loanTypeId }, { i: loanPolicyData.id }).then(
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
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
            authRefresh: true,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
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
      },
    );
  });
});
