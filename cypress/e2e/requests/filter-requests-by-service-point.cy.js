import uuid from 'uuid';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import editRequest from '../../support/fragments/requests/edit-request';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-requests: Filter requests by pickup service point', () => {
  let requestData;
  let instanceData;
  let servicePointId;
  let servicePointName;
  const newServicePoint = {
    code: `autotest_code_${getRandomPostfix()}`,
    id: uuid(),
    discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
    name: `autotest_service_point_name_${getRandomPostfix()}`,
    pickupLocation: true,
    holdShelfExpiryPeriod: { duration: 12, intervalId: 'Hours' },
  };

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(newServicePoint).then((response) => {
        servicePointId = response.body.id;
        servicePointName = response.body.name;
      });
      Requests.createRequestApi().then(({ createdRequest, instanceRecordData }) => {
        requestData = createdRequest;
        requestData.pickupServicePointId = servicePointId;
        instanceData = instanceRecordData;
        editRequest.updateRequestApi(requestData);
      });
    });
  });

  after(() => {
    Requests.deleteRequestViaApi(requestData.id);
    cy.deleteItemViaApi(instanceData.itemId);
    cy.deleteHoldingRecordViaApi(instanceData.holdingId);
    InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
    ServicePoints.deleteViaApi(servicePointId);
  });

  it(
    'C15178 Filter requests by pickup service point (vega) (TaaS)',
    { tags: ['criticalPathFlaky', 'vega', 'C15178'] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Requests.filterRequestsByServicePoints(servicePointName);
      cy.waitForAuthRefresh(() => {}, 20_000);
      Requests.selectFirstRequest(instanceData.instanceTitle);
      RequestDetail.checkRequesterInformation({
        lastName: requestData.requester.lastName,
        barcode: requestData.requester.barcode,
        group: Cypress.env('userGroups')[0].group,
        preference: requestData.fulfillmentPreference,
        pickupSP: servicePointName,
      });
    },
  );
});
