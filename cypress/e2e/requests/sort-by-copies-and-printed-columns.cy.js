import {
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  SORT_DIRECTIONS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Requests', () => {
  describe('Sorting', () => {
    const testData = {
      requesters: [],
      requests: [],
      instances: [],
    };
    let testPrefix;

    before('Create test data', () => {
      testPrefix = `AT_C553064_${getRandomPostfix()}`;

      cy.getAdminToken()
        .then(() => {
          cy.enablePrintEventLogFeature().then((setting) => {
            testData.printFeatureSetting = setting;
          });
        })
        .then(() => {
          Requests.createRequestApi(
            ITEM_STATUS_NAMES.AVAILABLE,
            REQUEST_TYPES.PAGE,
            REQUEST_LEVELS.ITEM,
            testPrefix,
          ).then(({ createdUser, createdRequest, instanceRecordData }) => {
            testData.requesters.push(createdUser);
            testData.requests.push(createdRequest);
            testData.instances.push(instanceRecordData);
          });
        })
        .then(() => {
          Requests.createRequestApi(
            ITEM_STATUS_NAMES.AVAILABLE,
            REQUEST_TYPES.PAGE,
            REQUEST_LEVELS.ITEM,
            testPrefix,
          ).then(({ createdUser, createdRequest, instanceRecordData }) => {
            testData.requesters.push(createdUser);
            testData.requests.push(createdRequest);
            testData.instances.push(instanceRecordData);
          });
        })
        .then(() => {
          // Request #3: not printed
          Requests.createRequestApi(
            ITEM_STATUS_NAMES.AVAILABLE,
            REQUEST_TYPES.PAGE,
            REQUEST_LEVELS.ITEM,
            testPrefix,
          ).then(({ createdUser, createdRequest, instanceRecordData }) => {
            testData.requesters.push(createdUser);
            testData.requests.push(createdRequest);
            testData.instances.push(instanceRecordData);
          });
        })
        .then(() => {
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then(
            (servicePoints) => {
              testData.servicePointId = servicePoints[0].id;
            },
          );
        })
        .then(() => {
          cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
            testData.user = userProperties;
            UserEdit.addServicePointViaApi(
              testData.servicePointId,
              testData.user.userId,
              testData.servicePointId,
            );
          });
        })
        .then(() => {
          // Request #1: printed once
          cy.createPrintEventApi(
            [testData.requests[0].id],
            testData.user.userId,
            testData.user.username,
          );
        })
        .then(() => {
          // Request #2: printed twice with a time gap
          cy.createPrintEventApi(
            [testData.requests[1].id],
            testData.user.userId,
            testData.user.username,
          );
          cy.createPrintEventApi(
            [testData.requests[1].id],
            testData.user.userId,
            testData.user.username,
          );
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitContentLoading,
          });
        })
        .then(() => {
          Requests.findCreatedRequest(testPrefix);
          Requests.verifyResultCount(3);
          Requests.selectCopiesColumnInActions(true);
          Requests.selectPrintedColumnInActions(true);
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.requests.forEach((request) => {
        Requests.deleteRequestViaApi(request.id);
      });
      testData.instances.forEach((instance) => {
        cy.deleteItemViaApi(instance.itemId);
        cy.deleteHoldingRecordViaApi(instance.holdingId);
        InventoryInstance.deleteInstanceViaApi(instance.instanceId);
      });
      testData.requesters.forEach((requester) => {
        Users.deleteViaApi(requester.id);
      });
      if (testData.user) {
        UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
          testData.servicePointId,
        ]);
        Users.deleteViaApi(testData.user.userId);
      }
      if (testData.printFeatureSetting) {
        cy.cleanupPrintEventLogFeature(testData.printFeatureSetting);
      }
    });

    it(
      'C553064 Sort requests by "# Copies" and "Printed" columns (volaris)',
      { tags: ['extendedPath', 'volaris', 'C553064'] },
      () => {
        // Step 1: Click on the "# Copies" column name
        Requests.clickCopiesColumnHeader();
        Requests.verifyCopiesColumnSortOrder(SORT_DIRECTIONS.ASCENDING);

        // Step 2: Click on the "# Copies" column name one more time
        Requests.clickCopiesColumnHeader();
        Requests.verifyCopiesColumnSortOrder(SORT_DIRECTIONS.DESCENDING);

        // Step 3: Click on the "Printed" column name
        Requests.clickPrintedColumnHeader();
        Requests.verifyPrintedColumnSortOrder(SORT_DIRECTIONS.ASCENDING);

        // Step 4: Click on the "Printed" column name one more time
        Requests.clickPrintedColumnHeader();
        Requests.verifyPrintedColumnSortOrder(SORT_DIRECTIONS.DESCENDING);
      },
    );
  });
});
