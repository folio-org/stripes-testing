import moment from 'moment';
import devTeams from '../../../support/dictionary/devTeams';
import testTypes from '../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../support/utils/stringTools';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import requestPolicy, { defaultRequestPolicy } from '../../../support/fragments/circulation/request-policy';
import patronGroups from '../../../support/fragments/settings/users/patronGroups';
import Users from '../../../support/fragments/users/users';
import DefaultUser from '../../../support/fragments/users/userDefaultObjects/defaultUser';
import inventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import circulationRules from '../../../support/fragments/circulation/circulation-rules';
import checkout from '../../../support/fragments/checkout/checkout';
import checkInActions from '../../../support/fragments/check-in-actions/checkInActions';
import requests from '../../../support/fragments/requests/requests';
import topMenu from '../../../support/fragments/topMenu';
import newRequest from '../../../support/fragments/requests/newRequest';

describe('ui-requests: Request: Edit requests. Make sure that edits are being saved.', () => {
  const requestPolicyWithRecall = defaultRequestPolicy;
  const testData = {
    instanceTitle: `For_request_${Number(new Date())}`,
    pickupServicePoint: 'Circ Desk 1',
  };
  const patronGroup = {};
  const userData0 = { ...DefaultUser.defaultApiPatron };
  const userData1 = { ...DefaultUser.defaultApiPatron };
  const ITEM_BARCODE = generateItemBarcode();
  userData1.username = `autotest_username_${getRandomPostfix()}`;
  userData1.barcode = `1234456_${getRandomPostfix()}`;
  requestPolicyWithRecall.requestTypes.push('Recall', 'Page');

  console.log(requestPolicyWithRecall);

  before('Creating circ rule with request policy, users and item with rolling loan period', () => {
    cy.getAdminToken();

    // Create request policy that allows recalls and pages
    requestPolicy.createApi(requestPolicyWithRecall).then((body) => {
      testData.requestPolicyId = body.id;
    });

    // Create 2 users in the same group
    patronGroups.createViaApi()
      .then(res => {
        patronGroup.id = res;
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
    ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
      .then((servicePoints) => {
        UserEdit.addServicePointViaApi(servicePoints[0].id, userData0.id).then((points) => {
          testData.userServicePoint = points.body.defaultServicePointId;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => { testData.materialType = res.id; });
        cy.getLocations({ limit: 1 }).then((res) => { testData.location = res.id; });
        cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingType = res[0].id; });
        InventoryHoldings.getHoldingSources({ limit: 1 }).then((res) => { testData.holdingSource = res[0].id; });
        cy.getInstanceTypes({ limit: 1 }).then((res) => { testData.instanceType = res[0].id; });
        cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanType = res[0].id; });
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: testData.instanceType,
            title: testData.instanceTitle,
          },
          holdings: [{
            holdingsTypeId: testData.holdingType,
            permanentLocationId: testData.location,
            sourceId: testData.holdingSource,
          }],
          items: [
            [{
              barcode: ITEM_BARCODE,
              missingPieces: '3',
              numberOfMissingPieces: '3',
              status: { name: 'Available' },
              permanentLoanType: { id: testData.loanType },
              materialType: { id: testData.materialType },
            }],
          ],
        });
      });

    // Create a circulation rule with an associated request policy that allows recalls and pages
    cy.getCirculationRules().then((res) => {
      testData.baseRules = res.rulesAsText;
      testData.ruleProps = circulationRules.getRuleProps(res.rulesAsText);
      testData.ruleProps.r = testData.requestPolicyId;

      circulationRules.addRuleApi(res.rulesAsText, testData.ruleProps, 'g ', patronGroup.id).then(() => {
        // checkout must happen after creating new circ rule
        checkout.checkoutItemViaApi({
          itemBarcode: ITEM_BARCODE,
          userBarcode: userData0.barcode,
          servicePointId: testData.userServicePoint,
        });
      });
    });

    // TODO: A client configured to use edge-patron API
  });

  after('Deleting circ rule, users and item with rolling loan period', () => {
    checkInActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: testData.userServicePoint,
      checkInDate: moment.utc().format(),
    }).then(() => {
      requests.getRequestIdViaApi({ limit:1, query: `item.barcode="${ITEM_BARCODE}"` })
        .then(requestId => {
          requests.deleteRequestApi(requestId);
          Users.deleteViaApi(userData0.id);
          Users.deleteViaApi(userData1.id);
          patronGroups.deleteViaApi(patronGroup.id);
        });
    });

    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        inventoryInstance.deleteInstanceViaApi(instance.id);
      });
    circulationRules.deleteRuleApi(testData.baseRules);
    requestPolicy.deleteApi(testData.requestPolicyId);
  });

  it('C350540 Recall an Item by Placing a Title-level Request Using Patron Services (MOD-PATRON): Item checked out with rolling due date (vega)', { tags: [devTeams.vega, testTypes.smoke] }, () => {
    const newRequestData = {
      itemBarcode: ITEM_BARCODE,
      itemTitle: testData.instanceTitle,
      requesterBarcode: userData1.barcode,
      pickupServicePoint: testData.pickupServicePoint,
      userProps: {
        lastName: userData1.personal.lastName,
        firstName: userData1.personal.firstName,
        middleName: userData1.personal.middleName,
      }
    };

    cy.loginAsAdmin({ path: topMenu.requestsPath, waiter: requests.waitContentLoading });

    newRequest.createNewRequest(newRequestData, 'Recall');
    newRequest.checkCreatedNewRequest(newRequestData, 'Recall');
  });
});
