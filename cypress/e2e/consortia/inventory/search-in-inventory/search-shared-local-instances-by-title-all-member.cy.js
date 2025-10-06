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
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const users = {};
    const createdHoldingsCollege = [];
    const createdHoldingsUniversity = [];
    const searchValue = 'C411612 Alternative title';
    const alternativeTitleTypeName = `C411612 Title type${getRandomPostfix()}`;
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const locationName = `C411612 Location / ${getRandomPostfix()}`;
    const sharedFOLIOInstancesFromCentral = [
      {
        title: 'C411612 Instance 4 Shared FOLIO',
        alternativeTitle: 'C411612 Alternative title 4',
      },
      {
        title: 'C411612 Instance 5 Shared FOLIO with Holdings',
        alternativeTitle: 'C411612 Alternative title 5',
      },
      {
        title: 'C411612 Instance 6 Shared FOLIO with Holdings',
        alternativeTitle: 'C411612 Alternative title 6',
      },
    ];
    const localFOLIOInstanceFromMember1 = {
      title: 'C411612 Instance 7 Local FOLIO with Holdings',
      alternativeTitle: 'C411612 Alternative title 7',
    };
    const localFOLIOInstanceFromMember2 = {
      title: 'C411612 Instance 9 Local FOLIO with Holdings',
      alternativeTitle: 'C411612 Alternative title 9',
    };
    const marcFiles = [
      {
        marc: 'marcBibFileC411612SharedCentral.mrc',
        fileName: `C411612 Central testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tenant: tenantNames.central,
        numOfRecords: 3,
        createdRecordsId: [],
      },
      {
        marc: 'marcBibFileC411612LocalMember1.mrc',
        fileName: `C411612 Member1 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tenant: tenantNames.college,
        numOfRecords: 1,
        createdRecordsId: [],
      },
      {
        marc: 'marcBibFileC411612LocalMember2.mrc',
        fileName: `C411612 Member2 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tenant: tenantNames.university,
        numOfRecords: 1,
        createdRecordsId: [],
      },
    ];

    before('Create user, data', () => {
      cy.getAdminToken();
      [Affiliations.College, Affiliations.University, Affiliations.Consortia].forEach(
        (affiliation) => {
          cy.setTenant(affiliation);
          InventoryInstances.deleteInstanceByTitleViaApi('C411612');
        },
      );
      cy.resetTenant();
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
            // 3 Shared "Instance" records with source = "Folio" and filled alternative title fields should exist on Central tenant.

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
            // 1 Local "Instance" record with source = "Folio" and filled alternative title field should exist in Member 1 tenant and
            // should have "Holdings" records created on Member 1 tenant.

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
                  title: localFOLIOInstanceFromMember1.title,
                  alternativeTitles: [
                    {
                      alternativeTitleTypeId: testData.alternativeTitleTypeIDCollege,
                      alternativeTitle: localFOLIOInstanceFromMember1.alternativeTitle,
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

            InventoryInstance.createAlternativeTitleTypeViaAPI(alternativeTitleTypeName).then(
              (alternativeTitleTypeID) => {
                testData.alternativeTitleTypeIDUniversity = alternativeTitleTypeID;
              },
            );

            const universityLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(universityLocationData).then((location) => {
              testData.universityLocation = location;

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: localFOLIOInstanceFromMember2.title,
                  alternativeTitles: [
                    {
                      alternativeTitleTypeId: testData.alternativeTitleTypeIDUniversity,
                      alternativeTitle: localFOLIOInstanceFromMember2.alternativeTitle,
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

            cy.resetTenant();
            marcFiles.forEach((marcFile) => {
              if (marcFile.tenant === 'College') {
                cy.setTenant(Affiliations.College);
              } else if (marcFile.tenant === 'University') {
                cy.setTenant(Affiliations.University);
              }
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  marcFile.createdRecordsId.push(record.instance.id);
                });
              });
            });
          })
          .then(() => {
            // 1 Shared "Instance" record with source = "MARC"
            //  and 1 Shared "Instance" record with source = "FOLIO" should have "Holdings" records created on Member 1 tenant.
            // 1 Local "Instance" record with source = "MARC" should have "Holdings" records created on Member 1 tenant

            cy.setTenant(Affiliations.College);
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              const collegeHoldingsSourceId = folioSource.id;
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: sharedFOLIOInstancesFromCentral[1].testInstanceId,
                permanentLocationId: testData.collegeLocation.id,
                sourceId: collegeHoldingsSourceId,
              }).then((holding) => {
                createdHoldingsCollege.push(holding.id);
              });
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: marcFiles[0].createdRecordsId[1],
                permanentLocationId: testData.collegeLocation.id,
                sourceId: collegeHoldingsSourceId,
              }).then((holding) => {
                createdHoldingsCollege.push(holding.id);
              });
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: marcFiles[1].createdRecordsId[0],
                permanentLocationId: testData.collegeLocation.id,
                sourceId: collegeHoldingsSourceId,
              }).then((holding) => {
                createdHoldingsCollege.push(holding.id);
              });
            });
          })
          .then(() => {
            // 1 Shared "Instance" record with source = "MARC" and 1 Shared "Instance" record with source = "FOLIO"
            //  should have "Holdings" records created on Member 2 tenant.
            // 1 Local "Instance" record with source = "MARC" should have "Holdings" records created on Member 2 tenant

            cy.setTenant(Affiliations.University);
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              const universityHoldingsSourceId = folioSource.id;
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: sharedFOLIOInstancesFromCentral[2].testInstanceId,
                permanentLocationId: testData.universityLocation.id,
                sourceId: universityHoldingsSourceId,
              }).then((holding) => {
                createdHoldingsUniversity.push(holding.id);
              });
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: marcFiles[0].createdRecordsId[2],
                permanentLocationId: testData.universityLocation.id,
                sourceId: universityHoldingsSourceId,
              }).then((holding) => {
                createdHoldingsUniversity.push(holding.id);
              });
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: marcFiles[2].createdRecordsId[0],
                permanentLocationId: testData.universityLocation.id,
                sourceId: universityHoldingsSourceId,
              }).then((holding) => {
                createdHoldingsUniversity.push(holding.id);
              });
            });
          });

        cy.waitForAuthRefresh(() => {
          cy.login(users.userProperties.username, users.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000).then(() => {
          InventoryInstances.waitContentLoading();
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
      cy.deleteAlternativeTitleTypes(testData.alternativeTitleTypeID);

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
      cy.deleteAlternativeTitleTypes(testData.alternativeTitleTypeIDCollege);

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
      cy.deleteAlternativeTitleTypes(testData.alternativeTitleTypeIDUniversity);
    });

    it(
      'C411612 Search for Shared/Local records by "Title (all)" search option from "Member" tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C411612'] },
      () => {
        InventorySearchAndFilter.selectSearchOptions('Title (all)', searchValue);
        InventorySearchAndFilter.verifySelectedSearchOption('title');
        InventorySearchAndFilter.clickSearch();

        InventorySearchAndFilter.verifySearchResult('C411612 Instance 1 Shared MARC');
        InventorySearchAndFilter.verifySearchResult('C411612 Instance 2 Shared MARC with Holdings');
        InventorySearchAndFilter.verifySearchResult('C411612 Instance 3 Shared MARC with Holdings');
        sharedFOLIOInstancesFromCentral.forEach((sharedFOLIOInstanceFromCentral) => {
          InventorySearchAndFilter.verifySearchResult(sharedFOLIOInstanceFromCentral.title);
        });
        InventorySearchAndFilter.verifySearchResult(localFOLIOInstanceFromMember1.title);
        InventorySearchAndFilter.verifySearchResult('C411612 Instance 8 Local MARC with Holdings');
      },
    );
  });
});
