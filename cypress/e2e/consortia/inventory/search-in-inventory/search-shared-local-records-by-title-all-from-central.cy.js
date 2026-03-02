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
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';

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
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tenant: tenantNames.central,
        propertyName: 'instance',
        numOfRecords: 2,
        createdRecordsId: [],
      },
      {
        marc: 'marcBibFileForC411611-Local.mrc',
        fileName: `C411611 Member1 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tenant: tenantNames.college,
        propertyName: 'instance',
        numOfRecords: 1,
        createdRecordsId: [],
      },
    ];

    before('Create user, data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C411611');
      InventoryInstances.deleteInstanceByTitleViaApi('C411611');
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
            InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
              (holdingSources) => {
                testData.collegeLocation = location;
                testData.holdingSourceId = holdingSources[0].id;
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
                      sourceId: testData.holdingSourceId,
                    },
                  ],
                }).then((specialInstanceIds) => {
                  localFOLIOInstanceFromMember.testInstanceId = specialInstanceIds.instanceId;
                  createdHoldingsCollege.push(specialInstanceIds.holdingIds[0].id);
                });
              },
            );
          });
        })
        .then(() => {
          marcFiles.forEach((marcFile) => {
            if (marcFile.tenant === tenantNames.college) {
              cy.setTenant(Affiliations.College);
            } else {
              cy.resetTenant();
              cy.getAdminToken();
            }
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                marcFile.createdRecordsId.push(record[marcFile.propertyName].id);
              });
            });
          });
        })

        .then(() => {
          cy.setTenant(Affiliations.College);

          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: sharedFOLIOInstancesFromCentral[1].testInstanceId,
            permanentLocationId: testData.collegeLocation.id,
            sourceId: testData.holdingSourceId,
          }).then((holding) => {
            createdHoldingsCollege.push(holding.id);
          });
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: marcFiles[0].createdRecordsId[1],
            permanentLocationId: testData.collegeLocation.id,
            sourceId: testData.holdingSourceId,
          }).then((holding) => {
            createdHoldingsCollege.push(holding.id);
          });
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: marcFiles[1].createdRecordsId[0],
            permanentLocationId: testData.collegeLocation.id,
            sourceId: testData.holdingSourceId,
          }).then((holding) => {
            createdHoldingsCollege.push(holding.id);
          });

          cy.resetTenant();
          cy.waitForAuthRefresh(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.instanceTabIsDefault();
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
      { tags: ['criticalPathECS', 'spitfire', 'C411611'] },
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
