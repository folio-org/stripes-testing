import uuid from 'uuid';
import { REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import createPageTypeRequest from '../../support/fragments/inventory/createPageTypeRequest';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MarkItemAsMissing from '../../support/fragments/inventory/markItemAsMissing';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Requests', () => {
  let user;
  let addedRule;
  let instanceData = {};
  let createdItem;
  const patronGroup = {
    name: `testGroup${getRandomPostfix()}`,
    id: '',
  };
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const requestPolicyBody = {
    requestTypes: Object.values(REQUEST_TYPES),
    name: `request${getRandomPostfix()}`,
    id: uuid(),
  };

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
          patronGroup.id = patronGroupResponse;
        });
        ServicePoints.createViaApi(servicePoint);
      })
      .then(() => {
        cy.createTempUser(
          [
            permissions.inventoryAll.gui,
            permissions.uiInventoryViewInstances.gui,
            permissions.uiUsersView.gui,
            permissions.uiUserEdit.gui,
            permissions.uiUsersCreate.gui,
            permissions.uiUsersEdituserservicepoints.gui,
            permissions.uiUserAccounts.gui,
            permissions.usersViewRequests.gui,
            permissions.uiRequestsAll.gui,
          ],
          patronGroup.name,
        );
      })
      .then((userProperties) => {
        user = userProperties;
        UserEdit.addServicePointViaApi(servicePoint.id, user.userId, servicePoint.id);
      })
      .then(() => {
        MarkItemAsMissing.createItemsForGivenStatusesApi
          .call(createPageTypeRequest)
          .then(({ items, instanceRecordData }) => {
            createdItem = items[0];
            instanceData = instanceRecordData;
            cy.intercept('GET', '**/requests?*').as('getRequests');
            cy.intercept('GET', '/users?*').as('getUsers');
            cy.intercept('POST', '**/requests').as('postRequest');
            cy.intercept('GET', '/inventory/items?').as('getItems');
            cy.intercept('GET', '/holdings-types?*').as('getHoldinsgTypes');
            cy.intercept('GET', '/instance-relationship-types?*').as('getInstanceRelTypes');
          });
      })
      .then(() => {
        RequestPolicy.createViaApi(requestPolicyBody);
        CirculationRules.addRuleViaApi({ g: patronGroup.id }, { r: requestPolicyBody.id }).then(
          (newRule) => {
            addedRule = newRule;
          },
        );
      });
  });

  afterEach(() => {
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(addedRule);
    cy.getItemRequestsApi({
      query: `"requesterId"="${user.userId}"`,
    }).then(({ body }) => {
      body.requests?.forEach((request) => {
        Requests.deleteRequestViaApi(request.id);
      });
    });
    cy.deleteItemViaApi(createdItem.itemId);
    cy.deleteHoldingRecordViaApi(instanceData.holdingId);
    InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
    UserEdit.changeServicePointPreferenceViaApi(user.userId, [servicePoint.id]);
    Users.deleteViaApi(user.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Requests.deleteRequestPolicyApi(requestPolicyBody.id);
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it(
    'C546 Create new request for "Page" type (vega)',
    { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C546'] },
    () => {
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
        authRefresh: true,
      });

      createPageTypeRequest.findAvailableItem(instanceData, createdItem.barcode);
      createPageTypeRequest.clickNewRequest(createdItem.barcode);
      createPageTypeRequest.selectActiveFacultyUser(user.username, patronGroup.name);
      createPageTypeRequest.saveAndClose(servicePoint.name, patronGroup.name);
      cy.wait(['@postRequest']);
      createPageTypeRequest.clickItemBarcodeLink(createdItem.barcode);
      createPageTypeRequest.verifyRequestsCountOnItemRecord();
      createPageTypeRequest.clickRequestsCountLink();
      createPageTypeRequest.clickRequesterBarcode(instanceData.instanceTitle, user.username);
      createPageTypeRequest.verifyOpenRequestCounts();
      createPageTypeRequest.clickOpenRequestsCountLink();
    },
  );
});
