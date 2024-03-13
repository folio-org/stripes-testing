import { Locations } from '../../../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const users = {};
    const createdHoldingsCollege = [];
    const searchValue = 'C411611 Alternative title';
    const alternativeTitleTypeName = `C411611 Title type${getRandomPostfix()}`;
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const locationName = `C411611 Location / ${getRandomPostfix()}`;
    const sharedFOLIOInstancesFromCentral = [
      {
        title: 'C411611 Instance 3 Shared FOLIO',
        alternativeTitle: 'C411611 Alternative title 3',
      },
      {
        title: 'C411611 Instance 4 Shared FOLIO with Holdings',
        alternativeTitle: 'C411611 Alternative title 4',
      },
    ];
    const localFOLIOInstanceFromMember = {
      title: 'C411611 Instance 5 Local FOLIO with Holdings',
      alternativeTitle: 'C411611 Alternative title 5',
    };
    const sharedMarcTitle1 = 'C411611 Instance 1 Shared MARC';
    const sharedMarcTitle2 = 'C411611 Instance 2 Shared MARC with Holdings';

    const marcFiles = [
      {
        marc: 'marcBibFileForC411611-Shared.mrc',
        fileName: `C411611 Central testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        tenant: tenantNames.central,
        numOfRecords: 2,
        createdRecordsId: [],
      },
      {
        marc: 'marcBibFileForC411611-Local.mrc',
        fileName: `C411611 Member1 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        tenant: tenantNames.college,
        numOfRecords: 1,
        createdRecordsId: [],
      },
    ];

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          users.userProperties = userProperties;

          cy.resetTenant();
          cy.getAdminToken();

          ServicePoints.createViaApi(testData.servicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi({ ...testData.defaultLocation, name: locationName });

          InventoryInstance.createAlternativeTitleTypeViaAPI(alternativeTitleTypeName).then(
            (alternativeTitleTypeID) => {
              testData.alternativeTitleTypeID = alternativeTitleTypeID;
            },
          );

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
        })
        .then(() => {
          sharedFOLIOInstancesFromCentral.forEach((sharedFOLIOInstance) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: sharedFOLIOInstance.title,
                alternativeTitles: [
                  {
                    alternativeTitleTypeId: testData.alternativeTitleTypeID,
                    alternativeTitle: sharedFOLIOInstance.alternativeTitle,
                  },
                ],
              },
            }).then((specialInstanceIds) => {
              sharedFOLIOInstance.testInstanceId = specialInstanceIds.instanceId;
            });
          });
        })
        .then(() => {
          cy.setTenant(Affiliations.College);

          InventoryInstance.createAlternativeTitleTypeViaAPI(alternativeTitleTypeName).then(
            (alternativeTitleTypeID) => {
              testData.alternativeTitleTypeIDCollege = alternativeTitleTypeID;
            },
          );

          const collegeLocationData = Locations.getDefaultLocation({
            servicePointId: ServicePoints.getDefaultServicePoint().id,
          }).location;
          Locations.createViaApi(collegeLocationData).then((location) => {
            testData.collegeLocation = location;
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: localFOLIOInstanceFromMember.title,
                alternativeTitles: [
                  {
                    alternativeTitleTypeId: testData.alternativeTitleTypeIDCollege,
                    alternativeTitle: localFOLIOInstanceFromMember.alternativeTitle,
                  },
                ],
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.collegeLocation.id,
                },
              ],
            }).then((specialInstanceIds) => {
              localFOLIOInstanceFromMember.testInstanceId = specialInstanceIds.instanceId;
              createdHoldingsCollege.push(specialInstanceIds.holdingIds[0].id);
            });
          });
        })
        .then(() => {
          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              marcFiles.forEach((marcFile) => {
                cy.visit(TopMenu.dataImportPath);
                if (marcFile.tenant === 'College') {
                  ConsortiumManager.switchActiveAffiliation(
                    tenantNames.central,
                    tenantNames.college,
                  );
                }
                DataImport.verifyUploadState();
                DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
                JobProfiles.waitLoadingList();
                JobProfiles.search(marcFile.jobProfileToRun);
                JobProfiles.runImportFile();
                Logs.waitFileIsImported(marcFile.fileName);
                Logs.checkJobStatus(marcFile.fileName, JOB_STATUS_NAMES.COMPLETED);
                Logs.openFileDetails(marcFile.fileName);
                for (let i = 0; i < marcFile.numOfRecords; i++) {
                  Logs.getCreatedItemsID(i).then((link) => {
                    marcFile.createdRecordsId.push(link.split('/')[5]);
                  });
                }
              });
            },
          );
        })
        .then(() => {
          cy.setTenant(Affiliations.College);

          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: sharedFOLIOInstancesFromCentral[1].testInstanceId,
            permanentLocationId: testData.collegeLocation.id,
          }).then((holding) => {
            createdHoldingsCollege.push(holding.id);
          });
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: marcFiles[0].createdRecordsId[1],
            permanentLocationId: testData.collegeLocation.id,
          }).then((holding) => {
            createdHoldingsCollege.push(holding.id);
          });
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: marcFiles[1].createdRecordsId[0],
            permanentLocationId: testData.collegeLocation.id,
          }).then((holding) => {
            createdHoldingsCollege.push(holding.id);
          });

          cy.login(users.userProperties.username, users.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            InventorySearchAndFilter.instanceTabIsDefault();
          });
        });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(users.userProperties.userId);
      sharedFOLIOInstancesFromCentral.forEach((sharedInstance) => {
        InventoryInstance.deleteInstanceViaApi(sharedInstance.testInstanceId);
      });
      marcFiles[0].createdRecordsId.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      cy.deleteAlternativeTitleTypes(testData.alternativeTitleTypeID);

      cy.setTenant(Affiliations.College);
      createdHoldingsCollege.forEach((collegeHoldingId) => {
        InventoryHoldings.deleteHoldingRecordViaApi(collegeHoldingId);
      });
      InventoryInstance.deleteInstanceViaApi(localFOLIOInstanceFromMember.testInstanceId);
      InventoryInstance.deleteInstanceViaApi(marcFiles[1].createdRecordsId[0]);
      InventoryInstance.deleteInstanceViaApi(sharedFOLIOInstancesFromCentral[1].testInstanceId);
      InventoryInstance.deleteInstanceViaApi(marcFiles[0].createdRecordsId[1]);
      Locations.deleteViaApi(testData.collegeLocation);
      cy.deleteAlternativeTitleTypes(testData.alternativeTitleTypeIDCollege);
    });

    it(
      'C411611 Search for Shared/Local records by "Title (all)" search option from "Central" tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire'] },
      () => {
        InventorySearchAndFilter.selectSearchOptions('Title (all)', searchValue);
        InventorySearchAndFilter.verifySelectedSearchOption('title');
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifySearchResult(sharedMarcTitle1);
        InventorySearchAndFilter.verifySearchResult(sharedMarcTitle2);
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstancesFromCentral[0].title);
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstancesFromCentral[1].title);
      },
    );
  });
});
