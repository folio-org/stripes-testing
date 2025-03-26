import {
  DEFAULT_JOB_PROFILE_NAMES,
  INSTANCE_SOURCE_NAMES,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = 'C402777Auto Instance';
      const callNumber = `C402777Auto ${randomPostfix}`;
      const testData = {
        collegeHoldings: [],
        universityHoldings: [],
        collegeItems: [],
        universityItems: [],
        instances: [
          { title: `${instancePrefix} 1 M1 Folio Shared`, callNumberInItem: false },
          { title: `${instancePrefix} 2 M1 MARC Shared`, callNumberInItem: true },
          { title: `${instancePrefix} 3 M1 Folio Local`, callNumberInItem: true },
          { title: `${instancePrefix} 4 M1 MARC Local`, callNumberInItem: false },
          { title: `${instancePrefix} 5 M2 Folio Shared`, callNumberInItem: true },
          { title: `${instancePrefix} 6 M2 MARC Shared`, callNumberInItem: false },
          { title: `${instancePrefix} 7 M2 Folio Local`, callNumberInItem: false },
          { title: `${instancePrefix} 8 M2 MARC Local`, callNumberInItem: true },
        ],
        sharedAccordionName: 'Shared',
        callNumberBrowseoption: 'Call numbers (all)',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileC407777Shared.mrc',
          fileNameImported: `testMarcFileC407777Shared.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numberOftitles: 2,
        },
        {
          marc: 'marcBibFileC407777LocalM1.mrc',
          fileNameImported: `testMarcFileC407777LocalM1.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numberOftitles: 1,
        },
        {
          marc: 'marcBibFileC407777LocalM2.mrc',
          fileNameImported: `testMarcFileC407777LocalM2.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numberOftitles: 1,
        },
      ];
      const folioInstances = testData.instances.filter((instance) => instance.title.includes('Folio'));
      const marcInstances = testData.instances.filter((instance) => instance.title.includes(INSTANCE_SOURCE_NAMES.MARC));
      const createdInstanceIds = {
        shared: [],
        college: [],
        university: [],
      };

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.createTempUser([])
          .then((userProperties) => {
            testData.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
            ]);

            cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
              () => {
                DataImport.verifyUploadState();
                DataImport.uploadFileAndRetry(marcFiles[0].marc, marcFiles[0].fileNameImported);
                JobProfiles.waitFileIsUploaded();
                JobProfiles.waitLoadingList();
                JobProfiles.search(marcFiles[0].jobProfileToRun);
                JobProfiles.runImportFile();
                JobProfiles.waitFileIsImported(marcFiles[0].fileNameImported);
                Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
                Logs.openFileDetails(marcFiles[0].fileNameImported);
                for (let i = 0; i < marcFiles[0].numberOftitles; i++) {
                  Logs.getCreatedItemsID(i).then((link) => {
                    createdInstanceIds.shared.push(link.split('/')[5]);
                  });
                }

                cy.intercept('/authn/refresh').as('refresh');
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
                cy.reload();
                cy.wait('@refresh', { timeout: 20_000 });
                DataImport.waitLoading();
                DataImport.verifyUploadState();
                DataImport.uploadFileAndRetry(marcFiles[1].marc, marcFiles[1].fileNameImported);
                JobProfiles.waitFileIsUploaded();
                JobProfiles.waitLoadingList();
                JobProfiles.search(marcFiles[1].jobProfileToRun);
                JobProfiles.runImportFile();
                JobProfiles.waitFileIsImported(marcFiles[1].fileNameImported);
                Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
                Logs.openFileDetails(marcFiles[1].fileNameImported);
                for (let i = 0; i < marcFiles[1].numberOftitles; i++) {
                  Logs.getCreatedItemsID(i).then((link) => {
                    createdInstanceIds.college.push(link.split('/')[5]);
                  });
                }

                ConsortiumManager.switchActiveAffiliation(
                  tenantNames.college,
                  tenantNames.university,
                );
                DataImport.waitLoading();
                DataImport.verifyUploadState();
                DataImport.uploadFileAndRetry(marcFiles[2].marc, marcFiles[2].fileNameImported);
                JobProfiles.waitFileIsUploaded();
                JobProfiles.waitLoadingList();
                JobProfiles.search(marcFiles[2].jobProfileToRun);
                JobProfiles.runImportFile();
                JobProfiles.waitFileIsImportedForConsortia(marcFiles[2].fileNameImported);
                Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
                Logs.openFileDetails(marcFiles[2].fileNameImported);
                for (let i = 0; i < marcFiles[2].numberOftitles; i++) {
                  Logs.getCreatedItemsID(i).then((link) => {
                    createdInstanceIds.university.push(link.split('/')[5]);
                  });
                }
              },
            );

            cy.setTenant(Affiliations.College);
            const collegeLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(collegeLocationData).then((location) => {
              testData.collegeLocation = location;
            });
            cy.createLoanType({
              name: getTestEntityValue('type'),
            }).then((loanType) => {
              testData.collegeLoanTypeId = loanType.id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((matType) => {
              testData.collegeMaterialTypeId = matType.id;
            });
            InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
              (holdingSources) => {
                testData.collegeSourceId = holdingSources[0].id;
              },
            );

            cy.setTenant(Affiliations.University);
            const universityLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(universityLocationData).then((location) => {
              testData.universityLocation = location;
            });
            cy.createLoanType({
              name: getTestEntityValue('type'),
            }).then((loanType) => {
              testData.universityLoanTypeId = loanType.id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((matType) => {
              testData.universityMaterialTypeId = matType.id;
            });
            InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
              (holdingSources) => {
                testData.universitySourceId = holdingSources[0].id;
              },
            );
          })
          .then(() => {
            function addHoldingsAndItem(currentInstanceId, currentInstanceData) {
              let targetLocation;
              let targetMaterialTypeId;
              let targetLoanTypeId;
              let targetSourceId;
              if (currentInstanceData.title.includes('M1')) {
                cy.setTenant(Affiliations.College);
                targetLocation = testData.collegeLocation;
                targetMaterialTypeId = testData.collegeMaterialTypeId;
                targetLoanTypeId = testData.collegeLoanTypeId;
                targetSourceId = testData.collegeSourceId;
              } else {
                cy.setTenant(Affiliations.University);
                targetLocation = testData.universityLocation;
                targetMaterialTypeId = testData.universityMaterialTypeId;
                targetLoanTypeId = testData.universityLoanTypeId;
                targetSourceId = testData.universitySourceId;
              }

              if (!currentInstanceData.callNumberInItem) {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: currentInstanceId,
                  permanentLocationId: targetLocation.id,
                  callNumber,
                  sourceId: targetSourceId,
                }).then((holding) => {
                  if (currentInstanceData.title.includes('M1')) testData.collegeHoldings.push(holding);
                  else testData.universityHoldings.push(holding);
                  InventoryItems.createItemViaApi({
                    holdingsRecordId: holding.id,
                    materialType: { id: targetMaterialTypeId },
                    permanentLoanType: { id: targetLoanTypeId },
                    status: { name: 'Available' },
                  }).then((item) => {
                    if (currentInstanceData.title.includes('M1')) testData.collegeItems.push(item);
                    else testData.universityItems.push(item);
                  });
                });
              } else {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: currentInstanceId,
                  permanentLocationId: targetLocation.id,
                  sourceId: targetSourceId,
                }).then((holding) => {
                  if (currentInstanceData.title.includes('M1')) testData.collegeHoldings.push(holding);
                  else testData.universityHoldings.push(holding);
                  InventoryItems.createItemViaApi({
                    holdingsRecordId: holding.id,
                    materialType: { id: targetMaterialTypeId },
                    permanentLoanType: { id: targetLoanTypeId },
                    status: { name: 'Available' },
                    itemLevelCallNumber: callNumber,
                  }).then((item) => {
                    if (currentInstanceData.title.includes('M1')) testData.collegeItems.push(item);
                    else testData.universityItems.push(item);
                  });
                });
              }
            }

            folioInstances
              .filter((instance) => instance.title.includes('Shared'))
              .forEach((sharedInstance) => {
                cy.resetTenant();
                InventoryInstance.createInstanceViaApi({
                  instanceTitle: sharedInstance.title,
                }).then((instanceData) => {
                  createdInstanceIds.shared.push(instanceData.instanceData.instanceId);
                  addHoldingsAndItem(instanceData.instanceData.instanceId, sharedInstance);
                });
              });

            folioInstances
              .filter(
                (instance) => instance.title.includes('Local') && instance.title.includes('M1'),
              )
              .forEach((collegeInstance) => {
                cy.setTenant(Affiliations.College);
                InventoryInstance.createInstanceViaApi({
                  instanceTitle: collegeInstance.title,
                }).then((instanceData) => {
                  createdInstanceIds.college.push(instanceData.instanceData.instanceId);
                  addHoldingsAndItem(instanceData.instanceData.instanceId, collegeInstance);
                });
              });

            folioInstances
              .filter(
                (instance) => instance.title.includes('Local') && instance.title.includes('M2'),
              )
              .forEach((universityInstance) => {
                cy.setTenant(Affiliations.University);
                InventoryInstance.createInstanceViaApi({
                  instanceTitle: universityInstance.title,
                }).then((instanceData) => {
                  createdInstanceIds.university.push(instanceData.instanceData.instanceId);
                  addHoldingsAndItem(instanceData.instanceData.instanceId, universityInstance);
                });
              });

            marcInstances
              .filter((instance) => instance.title.includes('Shared'))
              .forEach((sharedInstance, index) => {
                addHoldingsAndItem(createdInstanceIds.shared[index], sharedInstance);
              });

            marcInstances
              .filter(
                (instance) => instance.title.includes('Local') && instance.title.includes('M1'),
              )
              .forEach((collegeInstance, index) => {
                addHoldingsAndItem(createdInstanceIds.college[index], collegeInstance);
              });

            marcInstances
              .filter(
                (instance) => instance.title.includes('Local') && instance.title.includes('M2'),
              )
              .forEach((universityInstance, index) => {
                addHoldingsAndItem(createdInstanceIds.university[index], universityInstance);
              });

            cy.login(testData.userProperties.username, testData.userProperties.password).then(
              () => {
                cy.intercept('/authn/refresh').as('refresh');
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
                cy.visit(TopMenu.inventoryPath);
                InventoryInstances.waitContentLoading();
                cy.reload();
                cy.wait('@refresh', { timeout: 20_000 });
                InventoryInstances.waitContentLoading();
                InventorySearchAndFilter.selectBrowseCallNumbers();
              },
            );
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        cy.setTenant(Affiliations.College);
        testData.collegeItems.forEach((item) => {
          InventoryItems.deleteItemViaApi(item.id);
        });
        testData.collegeHoldings.forEach((holding) => {
          InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
        });
        Locations.deleteViaApi(testData.collegeLocation);
        cy.setTenant(Affiliations.University);
        testData.universityItems.forEach((item) => {
          InventoryItems.deleteItemViaApi(item.id);
        });
        testData.universityHoldings.forEach((holding) => {
          InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
        });
        Locations.deleteViaApi(testData.universityLocation);
        cy.setTenant(Affiliations.College);
        createdInstanceIds.college.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        cy.setTenant(Affiliations.University);
        createdInstanceIds.university.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        cy.resetTenant();
        createdInstanceIds.shared.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C402777 Apply "Shared" facet when Browse for same Call number existing in different tenants (exact match) (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C402777'] },
        () => {
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );
          cy.setTenant(Affiliations.College);
          BrowseCallNumber.waitForCallNumberToAppear(callNumber);
          cy.wait(5000);
          BrowseSubjects.browse(callNumber);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );
          BrowseCallNumber.clickOnResult(callNumber);
          InventoryInstances.waitLoading();
          InventoryInstance.verifySharedIconByTitle(testData.instances[0].title);
          InventoryInstance.verifySharedIconByTitle(testData.instances[1].title);
          InventoryInstance.verifySharedIconByTitle(testData.instances[4].title);
          InventoryInstance.verifySharedIconByTitle(testData.instances[5].title);
          InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[2].title);
          InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[3].title);
          InventorySearchAndFilter.verifyNumberOfSearchResults(6);

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyCallNumberBrowseNotEmptyPane();
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            true,
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '2');
          BrowseCallNumber.clickOnResult(callNumber);
          InventoryInstances.waitLoading();
          InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[2].title);
          InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[3].title);
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyCallNumberBrowseNotEmptyPane();
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            true,
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '2');
          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'No',
            false,
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'Yes',
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '4');
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            true,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            false,
          );
          BrowseCallNumber.clickOnResult(callNumber);
          InventoryInstances.waitLoading();
          InventoryInstance.verifySharedIconByTitle(testData.instances[0].title);
          InventoryInstance.verifySharedIconByTitle(testData.instances[1].title);
          InventoryInstance.verifySharedIconByTitle(testData.instances[4].title);
          InventoryInstance.verifySharedIconByTitle(testData.instances[5].title);
          InventorySearchAndFilter.verifyNumberOfSearchResults(4);

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyCallNumberBrowseNotEmptyPane();
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            true,
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '4');
          InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            true,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            true,
          );
          BrowseCallNumber.clickOnResult(callNumber);
          InventoryInstances.waitLoading();
          InventoryInstance.verifySharedIconByTitle(testData.instances[0].title);
          InventoryInstance.verifySharedIconByTitle(testData.instances[1].title);
          InventoryInstance.verifySharedIconByTitle(testData.instances[4].title);
          InventoryInstance.verifySharedIconByTitle(testData.instances[5].title);
          InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[2].title);
          InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[3].title);
          InventorySearchAndFilter.verifyNumberOfSearchResults(6);

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyCallNumberBrowseNotEmptyPane();
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'Yes',
            true,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            testData.sharedAccordionName,
            'No',
            true,
          );
        },
      );
    });
  });
});
