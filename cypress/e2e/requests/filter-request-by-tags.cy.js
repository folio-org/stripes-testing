import uuid from 'uuid';
import testType from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import Requests from '../../support/fragments/requests/requests';
import Users from '../../support/fragments/users/users';
import DevTeams from '../../support/dictionary/devTeams';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';

describe('ui-requests: Filter requests by tags', () => {
  const userIds = [];
  const requests = [];
  const instances = [];
  const requestTypes = { PAGE: 'Page', HOLD: 'Hold', RECALL: 'Recall' };
  const tagIDs = [];
  const tags = [
    {
      id: uuid(),
      description: uuid(),
      label: `aqa1_${uuid()}`,
    },
    {
      id: uuid(),
      description: uuid(),
      label: `aqa2_${uuid()}`,
    },
    {
      id: uuid(),
      description: uuid(),
      label: `aqa3_${uuid()}`,
    },
  ];

  beforeEach(() => {
    cy.loginAsAdmin();
    cy.getAdminToken().then(() => {
      Object.values(requestTypes).forEach((requestType) => {
        const itemStatus =
          requestType === REQUEST_TYPES.PAGE
            ? ITEM_STATUS_NAMES.AVAILABLE
            : ITEM_STATUS_NAMES.CHECKED_OUT;
        Requests.createRequestApi(itemStatus, requestType).then(
          ({ instanceRecordData, createdRequest, createdUser }) => {
            userIds.push(createdUser.id);
            instances.push(instanceRecordData);
            requests.push(createdRequest);
          },
        );
      });
    });
    tags.forEach((tag) => {
      cy.createTagApi(tag).then((tagID) => tagIDs.push(tagID));
    });
  });

  afterEach(() => {
    instances.forEach((instance) => {
      cy.deleteItemViaApi(instance.itemId);
      cy.deleteHoldingRecordViaApi(instance.holdingId);
      InventoryInstance.deleteInstanceViaApi(instance.instanceId);
    });
    requests.forEach((request) => {
      Requests.deleteRequestViaApi(request.id);
    });
    userIds.forEach((id) => {
      Users.deleteViaApi(id);
    });
    tagIDs.forEach((tagID) => {
      cy.deleteTagApi(tagID);
    });
  });

  it(
    'C9320 Filter requests by tags (vega) (TaaS)',
    { tags: [testType.extended, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.requestsPath);
      instances.forEach((instance, index) => {
        Requests.findCreatedRequest(instance.instanceTitle);
        Requests.selectFirstRequest(instance.instanceTitle);
        Requests.openTagsPane();
        Requests.addTag(tags[index].label);
        Requests.closePane('Tags');
        Requests.closePane('Request Detail');
        Requests.resetAllFilters();
        Requests.filterRequestsByTag(tags[index].label);
        Requests.selectFirstRequest(instance.instanceTitle);
        Requests.openTagsPane();
        Requests.verifyAssignedTags(tags[index].label);
        Requests.closePane('Tags');
        Requests.closePane('Request Detail');
        Requests.resetAllFilters();
      });
    },
  );
});
