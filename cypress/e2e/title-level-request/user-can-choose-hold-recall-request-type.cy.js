import { ITEM_STATUS_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Title Level Request', () => {
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const instanceData = {
    title: `Instance ${getRandomPostfix()}`,
    itemBarcode: generateItemBarcode(),
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        TitleLevelRequests.enableTLRViaApi();
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
          name: `type_C359154_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getDefaultMaterialType().then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
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
              barcode: testData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.CHECKED_OUT },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          cy.wait(3000).then(() => {
            cy.getInstance({
              limit: 1,
              expandAll: true,
              query: `"id"=="${instanceData.instanceId}"`,
            }).then((instance) => {
              testData.instanceHRID = instance.hrid;
            });
          });
        });
      });

    cy.createTempUser([Permissions.uiRequestsAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        testData.user.userId,
        testData.userServicePoint.id,
      ).then(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
          authRefresh: true,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceData.instanceId);
    Users.deleteViaApi(testData.user.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C359154 Check that user can choose request type when placing request ("Hold", "Recall") (vega) (TaaS)',
    { tags: ['criticalPath', 'vega', 'C359154'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.enterHridInfo(testData.instanceHRID);
      NewRequest.enterRequesterBarcode(testData.user.barcode);
      NewRequest.verifyTitleLevelRequestsCheckbox(true);
      NewRequest.verifyRequestTypeHasOptions('Hold', 'Recall');
    },
  );
});
