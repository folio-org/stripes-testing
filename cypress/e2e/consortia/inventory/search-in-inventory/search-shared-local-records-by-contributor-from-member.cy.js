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
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const users = {};
    const createdHoldingsCollege = [];
    const createdHoldingsUniversity = [];
    const searchValue = 'C411578 Contributor';
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const locationName = `C411578 Location / ${getRandomPostfix()}`;
    const sharedFOLIOInstancesFromCentral = [
      {
        title: 'C411578 Instance 4 Shared FOLIO',
        contributorName: 'C411578 Contributor 4',
      },
      {
        title: 'C411578 Instance 5 Shared FOLIO with Holdings',
        contributorName: 'C411578 Contributor 5',
      },
      {
        title: 'C411578 Instance 6 Shared FOLIO with Holdings',
        contributorName: 'C411578 Contributor 6',
      },
    ];
    const localFOLIOInstanceFromMember1 = {
      title: 'C411578 Instance 7 Local FOLIO with Holdings',
      contributorName: 'C411578 Contributor 7',
    };
    const localFOLIOInstanceFromMember2 = {
      title: 'C411578 Instance 9 Local FOLIO with Holdings',
      contributorName: 'C411578 Contributor 9',
    };
    const sharedMarcTitle1 = 'C411578 Instance 1 Shared MARC';
    const sharedMarcTitle2 = 'C411578 Instance 2 Shared MARC with Holdings';
    const sharedMarcTitle3 = 'C411578 Instance 3 Shared MARC with Holdings';
    const localSharedMarcTitle = 'C411578 Instance 8 Local MARC with Holdings';

    const marcFiles = [
      {
        marc: 'marcBibFileForC411578-Shared.mrc',
        fileName: `C411578 Central testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        tenant: tenantNames.central,
        numOfRecords: 3,
        createdRecordsId: [],
      },
      {
        marc: 'marcBibFileForC411578-Local-M1.mrc',
        fileName: `C411578 Member1 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        tenant: tenantNames.college,
        numOfRecords: 1,
        createdRecordsId: [],
      },
      {
        marc: 'marcBibFileForC411578-Local-M2.mrc',
        fileName: `C411578 Member2 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        tenant: tenantNames.university,
        numOfRecords: 1,
        createdRecordsId: [],
      },
    ];

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        users.userProperties = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(users.userProperties.userId, [
          Permissions.uiInventoryViewInstances.gui,
        ])
          .then(() => {
            cy.resetTenant();
            cy.getAdminToken();

            ServicePoints.createViaApi(testData.servicePoint);
            testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
            Location.createViaApi({ ...testData.defaultLocation, name: locationName });

            BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
              testData.contributorNameType = contributorNameTypes[0].id;
            });

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              testData.instanceTypeId = instanceTypes[0].id;
            });

            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              testData.holdingTypeId = res[0].id;
            });
          })
          .then(() => {
            // 3 Shared "Instance" records with source = "Folio" and filled alternative title fields should exist on Central tenant.

            sharedFOLIOInstancesFromCentral.forEach((sharedFOLIOInstance) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: sharedFOLIOInstance.title,
                  contributors: [
                    {
                      name: sharedFOLIOInstance.contributorName,
                      contributorNameTypeId: testData.contributorNameType,
                    },
                  ],
                },
              }).then((specialInstanceIds) => {
                sharedFOLIOInstance.testInstanceId = specialInstanceIds.instanceId;
              });
            });
          })
          .then(() => {
            // 1 Local "Instance" record with source = "Folio" and filled alternative title field should exist in Member 1 tenant and
            // should have "Holdings" records created on Member 1 tenant.

            cy.setTenant(Affiliations.College);

            BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
              testData.contributorNameTypeCollege = contributorNameTypes[0].id;
            });

            const collegeLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(collegeLocationData).then((location) => {
              testData.collegeLocation = location;
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: localFOLIOInstanceFromMember1.title,
                  contributors: [
                    {
                      name: localFOLIOInstanceFromMember1.contributorName,
                      contributorNameTypeId: testData.contributorNameTypeCollege,
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
                localFOLIOInstanceFromMember1.testInstanceId = specialInstanceIds.instanceId;
                createdHoldingsCollege.push(specialInstanceIds.holdingIds[0].id);
              });
            });
          })
          .then(() => {
            // 1 Local "Instance" record with source = "Folio" and filled alternative title field should exist in Member 2 tenant and
            // should have "Holdings" records created on Member 2 tenant.

            cy.setTenant(Affiliations.University);

            BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
              testData.contributorNameTypeUniversity = contributorNameTypes[0].id;
            });

            const universityLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(universityLocationData).then((location) => {
              testData.universityLocation = location;

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: localFOLIOInstanceFromMember2.title,
                  contributors: [
                    {
                      name: localFOLIOInstanceFromMember2.contributorName,
                      contributorNameTypeId: testData.contributorNameTypeUniversity,
                    },
                  ],
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.universityLocation.id,
                  },
                ],
              }).then((specialInstanceIds) => {
                localFOLIOInstanceFromMember2.testInstanceId = specialInstanceIds.instanceId;
                createdHoldingsUniversity.push(specialInstanceIds.holdingIds[0].id);
              });
            });
          })
          .then(() => {
            // 3 Shared "Instance" records with source = "MARC" and filled alternative title fields should exist on Central tenant.
            // 1 Local "Instance" record with source = "MARC" and filled alternative title fields should exist on Member 1 tenant.
            // 1 Local "Instance" record with source = "MARC" and filled alternative title fields should exist on Member 2 tenant.

            cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
              () => {
                marcFiles.forEach((marcFile) => {
                  cy.visit(TopMenu.dataImportPath);
                  if (marcFile.tenant === 'College') {
                    ConsortiumManager.switchActiveAffiliation(
                      tenantNames.central,
                      tenantNames.college,
                    );
                  } else if (marcFile.tenant === 'University') {
                    ConsortiumManager.switchActiveAffiliation(
                      tenantNames.college,
                      tenantNames.university,
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
            // 1 Shared "Instance" record with source = "MARC"
            //  and 1 Shared "Instance" record with source = "FOLIO" should have "Holdings" records created on Member 1 tenant.
            // 1 Local "Instance" record with source = "MARC" should have "Holdings" records created on Member 1 tenant

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
          })
          .then(() => {
            // 1 Shared "Instance" record with source = "MARC" and 1 Shared "Instance" record with source = "FOLIO"
            //  should have "Holdings" records created on Member 2 tenant.
            // 1 Local "Instance" record with source = "MARC" should have "Holdings" records created on Member 2 tenant

            cy.setTenant(Affiliations.University);

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: sharedFOLIOInstancesFromCentral[2].testInstanceId,
              permanentLocationId: testData.universityLocation.id,
            }).then((holding) => {
              createdHoldingsUniversity.push(holding.id);
            });
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: marcFiles[0].createdRecordsId[2],
              permanentLocationId: testData.universityLocation.id,
            }).then((holding) => {
              createdHoldingsUniversity.push(holding.id);
            });
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: marcFiles[2].createdRecordsId[0],
              permanentLocationId: testData.universityLocation.id,
            }).then((holding) => {
              createdHoldingsUniversity.push(holding.id);
            });
          });

        cy.login(users.userProperties.username, users.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventorySearchAndFilter.instanceTabIsDefault();
        });
      });
    });

    after('Delete user, data', () => {
      // delete test data from the Central
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

      // delete test data from the College
      cy.setTenant(Affiliations.College);
      createdHoldingsCollege.forEach((collegeHoldingId) => {
        InventoryHoldings.deleteHoldingRecordViaApi(collegeHoldingId);
      });
      InventoryInstance.deleteInstanceViaApi(localFOLIOInstanceFromMember1.testInstanceId);
      InventoryInstance.deleteInstanceViaApi(marcFiles[1].createdRecordsId[0]);
      InventoryInstance.deleteInstanceViaApi(sharedFOLIOInstancesFromCentral[1].testInstanceId);
      InventoryInstance.deleteInstanceViaApi(marcFiles[0].createdRecordsId[1]);
      Locations.deleteViaApi(testData.collegeLocation);

      // delete test data from the University
      cy.setTenant(Affiliations.University);
      createdHoldingsUniversity.forEach((universityHoldingId) => {
        InventoryHoldings.deleteHoldingRecordViaApi(universityHoldingId);
      });
      InventoryInstance.deleteInstanceViaApi(localFOLIOInstanceFromMember2.testInstanceId);
      InventoryInstance.deleteInstanceViaApi(sharedFOLIOInstancesFromCentral[2].testInstanceId);
      InventoryInstance.deleteInstanceViaApi(marcFiles[2].createdRecordsId[0]);
      InventoryInstance.deleteInstanceViaApi(marcFiles[0].createdRecordsId[2]);
      Locations.deleteViaApi(testData.universityLocation);
    });

    it(
      'C411578 Search for Shared/Local records by "Contributor" search option from "Member" tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire'] },
      () => {
        InventorySearchAndFilter.selectSearchOptions('Contributor', searchValue);
        InventorySearchAndFilter.verifySelectedSearchOption('contributor');
        InventorySearchAndFilter.clickSearch();

        InventorySearchAndFilter.verifySearchResult(sharedMarcTitle1);
        InventorySearchAndFilter.verifySearchResult(sharedMarcTitle2);
        InventorySearchAndFilter.verifySearchResult(sharedMarcTitle3);
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstancesFromCentral[0].title);
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstancesFromCentral[1].title);
        InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstancesFromCentral[2].title);
        InventorySearchAndFilter.verifySearchResult(localFOLIOInstanceFromMember1.title);
        InventorySearchAndFilter.verifySearchResult(localSharedMarcTitle);
      },
    );
  });
});
