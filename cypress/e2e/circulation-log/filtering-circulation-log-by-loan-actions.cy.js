import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import { getTestEntityValue } from '../../support/utils/stringTools';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import Checkout from '../../support/fragments/checkout/checkout';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';

describe('Circulation log', () => {
  let userData;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePoint(),
  };
  const loanPolicyBody = {
    id: uuid(),
    name: getTestEntityValue('nonLoanable'),
    loanable: false,
    renewable: false,
  };
  const filterByAction = (filterName, desc) => {
    const searchResultsData = {
      userBarcode: userData.barcode,
      itemBarcode: testData.itemBarcode,
      object: 'Loan',
      circAction: filterName,
      servicePoint: testData.userServicePoint.name,
      source: testData.adminSourceRecord,
      desc,
    };
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.waitLoading();
    SearchPane.setFilterOptionFromAccordion('loan', filterName);
    SearchPane.findResultRowIndexByContent(filterName).then((rowIndex) => {
      SearchPane.checkResultSearch(searchResultsData, rowIndex);
    });
    SearchPane.resetResults();
    SearchPane.searchByItemBarcode(testData.itemBarcode);
    SearchPane.findResultRowIndexByContent(filterName).then((rowIndex) => {
      SearchPane.checkResultSearch(searchResultsData, rowIndex);
    });
  };

  before('Preconditions', () => {
    cy.getAdminToken();
    cy.getAdminSourceRecord().then((record) => {
      testData.adminSourceRecord = record;
    });
    ServicePoints.createViaApi(testData.userServicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.userServicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
      testData.itemBarcode = testData.folioInstances[0].barcodes[0];
    });
    cy.createLoanType({
      name: getTestEntityValue('loan'),
    })
      .then((loanType) => {
        testData.loanTypeId = loanType.id;
        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${testData.itemBarcode}"`,
        }).then((res) => {
          res.permanentLoanType = { id: testData.loanTypeId };
          cy.updateItemViaApi(res);
        });
      })
      .then(() => {
        LoanPolicy.createViaApi(loanPolicyBody);
        CirculationRules.addRuleViaApi({ t: testData.loanTypeId }, { l: loanPolicyBody.id }).then(
          (newRule) => {
            testData.addedRule = newRule;
          },
        );
      });
    cy.createTempUser([permissions.circulationLogAll.gui])
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );
      })
      .then(() => {
        Checkout.checkoutThroughOverrideViaApi({
          itemBarcode: testData.itemBarcode,
          servicePointId: testData.userServicePoint.id,
          userBarcode: userData.barcode,
        });
        cy.loginAsAdmin();
      });
  });

  after('Deleting created entities', () => {
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    cy.deleteLoanPolicy(loanPolicyBody.id);
    CheckInActions.checkinItemViaApi({
      itemBarcode: testData.itemBarcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.userServicePoint,
      shouldCheckIn: true,
    });
    cy.deleteLoanType(testData.loanTypeId);
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C16982 Filter Circulation log by Checked out through override (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      filterByAction('Checked out through override', 'Checked out to proxy: no.');
    },
  );
});
