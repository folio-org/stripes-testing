import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import getRandomPostfix from '../../support/utils/stringTools';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import generateItemBarcode from '../../support/utils/generateItemBarcode';

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
        cy.loginAsAdmin({
          path: SettingsMenu.circulationTitleLevelRequestsPath,
          waiter: TitleLevelRequests.waitLoading,
        });
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
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
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
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${instanceData.instanceId}"`,
          }).then((instance) => {
            testData.instanceHRID = instance.hrid;
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
        });
      });
    });
  });

  after('Delete test data', () => {
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceData.instanceId);
    Users.deleteViaApi(testData.user.userId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C359154 Check that user can choose request type when placing request ("Hold", "Recall") (vega) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.enterHridInfo(testData.instanceHRID);
      NewRequest.enterRequesterBarcode(testData.user.barcode);
      NewRequest.verifyTitleLevelRequestsCheckbox('checked');
      NewRequest.verifyRequestTypeHasOptions('Hold', 'Recall');
    },
  );
});
