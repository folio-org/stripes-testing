import uuid from 'uuid';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Requests from '../../support/fragments/requests/requests';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';

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
  let testUser;
  let servicePoint;
  let defaultLocation;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
      ServicePoints.createViaApi(servicePoint);
      defaultLocation = Location.getDefaultLocation(servicePoint.id);
      Location.createViaApi(defaultLocation);

      cy.createTempUser([
        Permissions.uiRequestsAll.gui,
        Permissions.uiTagsPermissionAll.gui,
        Permissions.uiCreateEditDeleteLoanTypes.gui,
        Permissions.uiUsersCreate.gui,
        Permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        testUser = userProperties;
        cy.login(testUser.username, testUser.password);
      });
    });

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

      tags.forEach((tag) => {
        cy.createTagApi(tag).then((tagID) => tagIDs.push(tagID));
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
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
      Users.deleteViaApi(testUser.userId);
      ServicePoints.deleteViaApi(servicePoint.id);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        defaultLocation.institutionId,
        defaultLocation.campusId,
        defaultLocation.libraryId,
        defaultLocation.id,
      );
    });
  });

  it(
    'C9320 Filter requests by tags (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C9320'] },
    () => {
      cy.visit(TopMenu.requestsPath);
      instances.forEach((instance, index) => {
        Requests.findCreatedRequest(instance.instanceTitle);
        Requests.selectFirstRequest(instance.instanceTitle);
        Requests.openTagsPane();
        Requests.addTag(tags[index].label);
        Requests.closePane('Tags');
        Requests.closePane('Request details');
        Requests.resetAllFilters();
        Requests.filterRequestsByTag(tags[index].label);
        Requests.selectFirstRequest(instance.instanceTitle);
        Requests.openTagsPane();
        Requests.verifyAssignedTags(tags[index].label);
        Requests.closePane('Tags');
        Requests.closePane('Request details');
        Requests.resetAllFilters();
      });
    },
  );
});
