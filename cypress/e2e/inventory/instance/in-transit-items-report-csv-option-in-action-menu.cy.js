import uuid from 'uuid';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      permanentLocationUI: LOCATION_NAMES.ANNEX_UI,
      itemBarcode: uuid(),
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${testData.permanentLocationUI}"` }).then((locations) => {
            testData.locationsId = locations.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [
              {
                barcode: testData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            testData.testInstanceIds = specialInstanceIds;

            ServicePoints.getCircDesk2ServicePointViaApi()
              .then((servicePoint) => {
                testData.servicePointId = servicePoint.id;
              })
              .then(() => {
                CheckInActions.checkinItemViaApi({
                  itemBarcode: testData.itemBarcode,
                  servicePointId: testData.servicePointId,
                  checkInDate: new Date().toISOString(),
                });
              });
          });
        });

      cy.createTempUser([
        Permissions.inventoryCreateAndDownloadInTransitItemsReport.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    afterEach('Delete test data', () => {
      FileManager.deleteFileFromDownloadsByMask('InTransit.csv');
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      });
    });

    it(
      'C466097 Check "In transit items report (CSV)" option in Actions menu (folijet)',
      { tags: ['extendedPath', 'folijet', 'C466097'] },
      () => {
        InventoryInstances.validateOptionInActionsMenu('In transit items report (CSV)', true);
        InventoryInstances.selectInTransitItemsReportCsvOption();
        const present = true;
        FileManager.verifyFileIncludes('InTransit.csv', [testData.itemBarcode], present);
      },
    );
  });
});
