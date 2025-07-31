import { DEFAULT_JOB_PROFILE_NAMES, ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue, randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  folioInstance: {
    title: `C410764_folio_instance${randomFourDigitNumber()}`,
    barcode: randomFourDigitNumber(),
  },
  marcInstance: {
    title: `C410764_marc_instance${randomFourDigitNumber()}`,
    barcode: randomFourDigitNumber(),
  },
  user: {},
  searchOptions: {
    titleAll: 'Title (all)',
    contributor: 'Contributor',
    holdingUUID: {
      title: 'Holdings UUID',
      value: 'holdingsId',
    },
    holdingHRID: {
      title: 'Holdings HRID',
      value: 'holdingsHrid',
    },
    barcode: {
      title: 'Barcode',
      value: 'items.barcode',
    },
    itemUUID: {
      title: 'Item UUID',
      value: 'iid',
    },
  },
  marcFile: {
    marc: 'marcBibC410764.mrc',
    fileName: `testMarcFileC410764.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 1,
    propertyName: 'instance',
  },
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: 'title="C410764"',
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
              });
            }
          });
          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.marcInstance.id = record[testData.marcFile.propertyName].id;
            });
          });
        })
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
            name: getTestEntityValue('type'),
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
              title: testData.folioInstance.title,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: testData.folioInstance.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          });
        })
        .then((instance) => {
          testData.folioInstance.id = instance.instanceId;
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${instance.instanceId}"`,
          }).then((holdings) => {
            testData.folioInstance.uuid = holdings[0].id;
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.marcInstance.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.folioInstance.barcode,
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C410764 Change selected search option when facet is applied to the result list (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C410764', 'eurekaPhase1'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.selectSearchOptions(testData.searchOptions.titleAll, 'C410764');
        InventorySearchAndFilter.clickSearch();
        InventoryInstances.verifyInstanceResultListIsAbsent(false);
        InventorySearchAndFilter.checkRowsCount(2);

        InventorySearchAndFilter.bySource('FOLIO');
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.selectSearchOptions(testData.searchOptions.contributor, 'C410764');
        InventoryInstances.verifySelectedSearchOption(testData.searchOptions.contributor);

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.selectSearchOptions(
          testData.searchOptions.holdingUUID.title,
          testData.folioInstance.uuid,
        );
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.folioInstance.title, true);
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.bySource('FOLIO');
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.selectSearchOptions(
          testData.searchOptions.holdingHRID.title,
          'C410764',
        );
        InventorySearchAndFilter.verifySelectedSearchOption(
          testData.searchOptions.holdingHRID.value,
        );

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.selectSearchOptions(
          testData.searchOptions.barcode.title,
          `${testData.folioInstance.barcode}`,
        );
        InventorySearchAndFilter.clickSearch();
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.folioInstance.title, true);
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.searchByStatus('Available');
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.folioInstance.title, true);
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.selectSearchOptions(
          testData.searchOptions.itemUUID.title,
          'C410764',
        );
        InventorySearchAndFilter.verifySelectedSearchOption(testData.searchOptions.itemUUID.value);
      },
    );
  });
});
