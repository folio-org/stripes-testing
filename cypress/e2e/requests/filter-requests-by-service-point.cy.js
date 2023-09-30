import uuid from 'uuid';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import getRandomPostfix from '../../support/utils/stringTools';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import editRequest from '../../support/fragments/requests/edit-request';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import { TestTypes, DevTeams } from '../../support/dictionary';

describe('ui-requests: Filter requests by pickup service point', () => {
  let requestData;
  let instanceData;
  let servicePointId;
  let servicePointName;
  const patronGroup = 'staff';
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
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Requests.filterRequestsByServicePoints(servicePointName);
      Requests.selectFirstRequest(instanceData.instanceTitle);
      RequestDetail.checkRequesterInformation({
        lastName: requestData.requester.lastName,
        barcode: requestData.requester.barcode,
        group: patronGroup,
        preference: requestData.fulfillmentPreference,
        pickupSP: servicePointName,
      });
    },
  );
});
