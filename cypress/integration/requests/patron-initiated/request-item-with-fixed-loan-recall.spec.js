import moment from 'moment';
import getRandomPostfix from '../../../support/utils/stringTools';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import RequestPolicy, { defaultRequestPolicy } from '../../../support/fragments/circulation/request-policy';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import Users from '../../../support/fragments/users/users';
import DefaultUser from '../../../support/fragments/users/userDefaultObjects/defaultUser';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import Checkout from '../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Requests from '../../../support/fragments/requests/requests';
import NewRequest from '../../../support/fragments/requests/newRequest';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FixedDueDateSchedules from '../../../support/fragments/circulation/fixedDueDateSchedules';
import LoanPolicyActions from '../../../support/fragments/circulation/loan-policy';

describe('ui-requests: title-level-requests', () => {
  // TODO: A client configured to use edge-patron API
  const testData = {
    pickupServicePoint: 'Circ Desk 1',
    limitOfItem: 2,
    patronGroup: {},
  };
  const userData0 = { ...DefaultUser.defaultApiPatron };
  const userData1 = { ...DefaultUser.defaultApiPatron };
  userData1.username = `autotest_username_${getRandomPostfix()}`;
  userData1.barcode = `1234456_${getRandomPostfix()}`;
  const requestPolicyWithRecall = defaultRequestPolicy;
  requestPolicyWithRecall.requestTypes.push('Recall', 'Page');
  const item = {
    instanceName: `For_request_${getRandomPostfix()}`,
    itemBarcode: generateItemBarcode(),
  };
  const newRequestData = {
    itemBarcode: item.itemBarcode,
    itemTitle: testData.instanceName,
    requesterBarcode: userData1.barcode,
    pickupServicePoint: testData.pickupServicePoint,
    userProps: {
      lastName: userData1.personal.lastName,
      firstName: userData1.personal.firstName,
      middleName: userData1.personal.middleName,
    }
  };


  before('Creating circ rule with request policy, users and item with rolling loan period', () => {
    cy.getAdminToken();

    // Create request policy that allows recalls and pages
    RequestPolicy.createViaApi(requestPolicyWithRecall).then((body) => {
      testData.requestPolicy = body;
    });

    // Create loan policy
    FixedDueDateSchedules.createViaApi()
      .then((schedule) => {
        testData.scheduleId = schedule.id;
        LoanPolicyActions.createViaApi(LoanPolicyActions.getDefaultLoanPolicy(testData.limitOfItem, schedule.id))
          .then((policy) => {
            testData.loanPolicy = policy;
          });
      });

    // Create 2 users in the same group
    PatronGroups.createViaApi()
      .then(res => {
        testData.patronGroup.id = res;
        Users.createViaApi({
          patronGroup: res,
          ...userData0
        }).then((createdUser) => {
          userData0.id = createdUser.id;
        });

        Users.createViaApi({
          patronGroup: res,
          ...userData1
        }).then((createdUser) => {
          userData1.id = createdUser.id;
        });
      });

    // Create item with remembered instance type
    InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
    ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
      .then((servicePoints) => {
        UserEdit.addServicePointViaApi(servicePoints[0].id, userData0.id).then((points) => {
          testData.userServicePoint = points.body.defaultServicePointId;
        });
      });

    // Create a circulation rule with an associated request policy that allows recalls and pages and with loan policy that uses fixed due date periods
    cy.getCirculationRules().then((res) => {
      testData.baseRules = res.rulesAsText;
      testData.ruleProps = CirculationRules.getRuleProps(res.rulesAsText);
      testData.ruleProps.r = testData.requestPolicy.id;
      testData.ruleProps.l = testData.loanPolicy.id;

      CirculationRules.addRuleViaApi(res.rulesAsText, testData.ruleProps, 'g ', testData.patronGroup.id).then(() => {
        // checkout must happen after creating new circ rule
        Checkout.checkoutItemViaApi({
          itemBarcode: item.itemBarcode,
          userBarcode: userData0.barcode,
          servicePointId: testData.userServicePoint,
        });
      });
    });
  });

  after('Deleting circ rule, users and item with rolling loan period', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: item.itemBarcode,
      servicePointId: testData.userServicePoint,
      checkInDate: moment.utc().format(),
    }).then(() => {
      Requests.getRequestIdViaApi({ limit:1, query: `item.barcode="${item.itemBarcode}"` })
        .then(requestId => {
          Requests.deleteRequestApi(requestId);
          Users.deleteViaApi(userData0.id);
          Users.deleteViaApi(userData1.id);
          PatronGroups.deleteViaApi(testData.patronGroup.id);
        });
    });

    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    CirculationRules.deleteRuleViaApi(testData.baseRules);
    RequestPolicy.deleteViaApi(testData.requestPolicy.id);
    cy.deleteLoanPolicy(testData.loanPolicy.id);
    FixedDueDateSchedules.deleteViaApi(testData.scheduleId);

    cy.visit(SettingsMenu.circulationTitleLevelRequestsPath);
    // TODO: write API request to check
    // TODO: Disable Title Level Request
    // TitleLevelRequests.clickTitleLevelRequestsCheckbox();
    // TitleLevelRequests.checkTitleRequestsDisabled();
  });

  it('C350540 Recall an Item by Placing a Title-level Request Using Patron Services (MOD-PATRON): Item checked out with rolling due date (vega)', { tags: [DevTeams.vega, TestTypes.smoke] }, () => {
    cy.loginAsAdmin({ path: TopMenu.requestsPath, waiter: Requests.waitContentLoading });
    // TODO: Enable Title Level Requests
    // TitleLevelRequests.clickTitleLevelRequestsCheckbox();
    // TitleLevelRequests.checkTitleRequestsEnabled();

    // TODO: Check if this is fine doing via UI
    NewRequest.createNewRequest(newRequestData, 'Recall');
    NewRequest.checkCreatedNewRequest(newRequestData, 'Recall');
  });
});
