import uuid from 'uuid';
import Permissions from '../../support/dictionary/permissions';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import getRandomPostfix from '../../support/utils/stringTools';

import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';

describe('Requests', () => {
  let userData = {};
  const requestIds = [];
  const patronGroup = {
    name: 'groupTLR' + getRandomPostfix(),
  };
  const instancesData = [
    {
      title: `"Bob" ${getRandomPostfix()}`,
    },
    {
      title: `Job" ${getRandomPostfix()}`,
    },
    {
      title: `"example ${getRandomPostfix()}`,
    },
  ];
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    itemBarcode: generateItemBarcode(),
  };
  const requestPolicyBody = {
    requestTypes: [REQUEST_TYPES.PAGE, REQUEST_TYPES.HOLD],
    name: `requestPolicy${getRandomPostfix()}`,
    id: uuid(),
  };
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

  before('Create test data', () => {
    instancesData.forEach((item, index) => {
      item.barcode = generateUniqueItemBarcodeWithShift(index);
    });

    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_C380518_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getDefaultMaterialType().then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        instancesData.forEach((instanceData, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instanceData.title,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: instanceData.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            instancesData[index].instanceId = specialInstanceIds.instanceId;
            instancesData[index].holdingId = specialInstanceIds.holdings[0].id;
            instancesData[index].itemId = specialInstanceIds.items[0].id;
            instancesData[index].materialType = testData.materialType;
          });
        });
      })
      .then(() => {
        RequestPolicy.createViaApi(requestPolicyBody);
        CirculationRules.addRuleViaApi(
          { t: testData.loanTypeId },
          { r: requestPolicyBody.id },
        ).then((newRule) => {
          testData.addedRule = newRule;
        });
      });

    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    ServicePoints.createViaApi(servicePoint);

    cy.createTempUser([Permissions.uiRequestsAll.gui], patronGroup.name).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);
      instancesData.forEach((instance) => {
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: testData.holdingTypeId,
          instanceId: instance.instanceId,
          item: { barcode: instance.barcode },
          itemId: instance.itemId,
          pickupServicePointId: testData.userServicePoint.id,
          requestDate: new Date(),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: userData.userId,
        }).then((request) => {
          requestIds.push(request.body.id);
        });
      });
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.wrap(requestIds).each((id) => {
      Requests.deleteRequestViaApi(id);
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    instancesData.forEach((instance) => {
      cy.deleteItemViaApi(instance.itemId);
      cy.deleteHoldingRecordViaApi(instance.holdingId);
      InventoryInstance.deleteInstanceViaApi(instance.instanceId);
    });
    ServicePoints.deleteViaApi(servicePoint.id);
    cy.deleteLoanType(testData.loanTypeId);
    Location.deleteViaApi(testData.defaultLocation.id);
  });

  it(
    'C380518 Verify user can use double quotes in search fields of Requests app (Vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C380518'] },
    () => {
      instancesData.forEach((instance) => {
        Requests.findCreatedRequest(instance.title);
        Requests.verifyCreatedRequest(instance.title);
      });
    },
  );
});
