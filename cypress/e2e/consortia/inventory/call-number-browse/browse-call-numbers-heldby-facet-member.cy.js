/* eslint-disable no-unused-vars */
import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix, {
  getTestEntityValue,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const instancePrefix = `TestAuto Instance ${getRandomLetters(7)}`;
      const callNumberPrefix = `TestAuto ${getRandomLetters(7)}`;
      const testData = {
        instances: [
          {
            title: `${instancePrefix} 1`,
            instanceTenant: Affiliations.Consortia,
            isMarc: true,
            holdings: {
              [tenantNames.college]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 1`,
              },
              [tenantNames.university]: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M2 Shared 1`,
              },
            },
          },
          {
            title: `${instancePrefix} 2`,
            instanceTenant: Affiliations.Consortia,
            isMarc: true,
            holdings: {
              [tenantNames.college]: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M1 Shared 2`,
              },
              [tenantNames.university]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M2 Shared 2`,
              },
            },
          },
          {
            title: `${instancePrefix} 3`,
            instanceTenant: Affiliations.Consortia,
            isMarc: false,
            holdings: {
              [tenantNames.college]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 3`,
              },
              [tenantNames.university]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M2 Shared 3`,
              },
            },
          },
          {
            title: `${instancePrefix} 4`,
            instanceTenant: Affiliations.Consortia,
            isMarc: true,
            holdings: {
              [tenantNames.college]: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M1 Shared 4`,
              },
              [tenantNames.university]: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M2 Shared 4`,
              },
            },
          },
          {
            title: `${instancePrefix} 5`,
            instanceTenant: Affiliations.Consortia,
            isMarc: true,
            holdings: {
              [tenantNames.college]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 5`,
              },
              [tenantNames.university]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M2 Shared 5`,
              },
            },
          },
          {
            title: `${instancePrefix} 6`,
            instanceTenant: Affiliations.Consortia,
            isMarc: false,
            holdings: {
              [tenantNames.college]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 6`,
              },
              [tenantNames.university]: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M2 Shared 6`,
              },
            },
          },
          {
            title: `${instancePrefix} 7`,
            instanceTenant: Affiliations.Consortia,
            isMarc: true,
            holdings: {
              [tenantNames.college]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 7`,
              },
            },
          },
          {
            title: `${instancePrefix} 8`,
            instanceTenant: Affiliations.Consortia,
            isMarc: false,
            holdings: {
              [tenantNames.university]: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M2 Shared 8`,
              },
            },
          },
          {
            title: `${instancePrefix} 9`,
            instanceTenant: Affiliations.College,
            isMarc: true,
            holdings: {
              [tenantNames.college]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Local 9`,
              },
            },
          },
          {
            title: `${instancePrefix} 10`,
            instanceTenant: Affiliations.College,
            isMarc: false,
            holdings: {
              [tenantNames.college]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Local 10`,
              },
            },
          },
          {
            title: `${instancePrefix} 11`,
            instanceTenant: Affiliations.University,
            isMarc: false,
            holdings: {
              [tenantNames.university]: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M2 Local 11`,
              },
            },
          },
        ],
        heldByAccordionName: 'Held by',
        callNumberBrowseoption: 'Call numbers (all)',
      };
      const marcFiles = [
        {
          marc: 'testMarcBibC404353Shared.mrc',
          fileNameImported: `testMarcBibC404353Shared.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          numberOftitles: 5,
        },
        {
          marc: 'testMarcBibC404353Local.mrc',
          fileNameImported: `testMarcBibC404353Local.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          numberOftitles: 1,
        },
      ];
      const createdInstanceIds = {
        consortia: [],
        college: [],
        university: [],
      };
      const createdHoldingsIds = {
        college: [],
        university: [],
      };
      const createdItemIds = {
        college: [],
        university: [],
      };
      const locations = {};
      const loanTypeIds = {};
      const materialTypeIds = {};

      function createFolioInstance(instanceTitle, tenantId) {
        const targetTenant = Object.keys(Affiliations)
          .find((key) => Affiliations[key] === tenantId)
          .toLowerCase();
        cy.setTenant(tenantId);
        InventoryInstance.createInstanceViaApi({
          instanceTitle,
        }).then((instanceData) => {
          createdInstanceIds[targetTenant].push(instanceData.instanceData.instanceId);
          testData.instances.find((instance) => instance.title === instanceTitle).instanceId =
            instanceData.instanceData.instanceId;
        });
      }

      function addHoldingsRecord(instanceId, tenantId) {
        cy.log('hold for ' + instanceId + ' | ' + tenantId);
        const instance = testData.instances.find((inst) => inst.instanceId === instanceId);
        const targetTenant = Object.keys(Affiliations)
          .find((key) => Affiliations[key] === tenantId)
          .toLowerCase();
        if (Object.hasOwn(instance.holdings, targetTenant)) {
          cy.setTenant(tenantId);
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId,
            permanentLocationId: locations[targetTenant].id,
            callNumber: instance.holdings[targetTenant].callNumberInHoldings
              ? instance.holdings[targetTenant].callNumber
              : null,
          }).then((holding) => {
            createdHoldingsIds[targetTenant].push(holding.id);
            instance.holdings[targetTenant].id = holding.id;
          });
        }
      }

      function addItemRecord(instanceId, tenantId) {
        cy.log('item for ' + instanceId + ' | ' + tenantId);
        const instance = testData.instances.find((inst) => inst.instanceId === instanceId);
        const targetTenant = Object.keys(Affiliations)
          .find((key) => Affiliations[key] === tenantId)
          .toLowerCase();
        if (Object.hasOwn(instance.holdings, targetTenant)) {
          cy.setTenant(tenantId);
          InventoryItems.createItemViaApi({
            holdingsRecordId: instance.holdings[targetTenant].id,
            materialType: { id: materialTypeIds[targetTenant] },
            permanentLoanType: { id: loanTypeIds[targetTenant] },
            status: { name: 'Available' },
            itemLevelCallNumber: instance.holdings[targetTenant].callNumberInHoldings
              ? null
              : instance.holdings[targetTenant].callNumber,
          }).then((item) => {
            createdItemIds[targetTenant].push(item.id);
          });
        }
      }

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.createTempUser([])
          .then((userProperties) => {
            testData.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.inventoryAll.gui,
            ]);

            // cy.loginAsAdmin().then(() => {
            //   ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            //   cy.visit(TopMenu.dataImportPath);
            //   DataImport.verifyUploadState();
            //   DataImport.uploadFileAndRetry(marcFiles[0].marc, marcFiles[0].fileNameImported);
            //   JobProfiles.waitFileIsUploaded();
            //   JobProfiles.waitLoadingList();
            //   JobProfiles.search(marcFiles[0].jobProfileToRun);
            //   JobProfiles.runImportFile();
            //   JobProfiles.waitFileIsImported(marcFiles[0].fileNameImported);
            //   Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            //   Logs.openFileDetails(marcFiles[0].fileNameImported);
            //   for (let i = 0; i < marcFiles[0].numberOftitles; i++) {
            //     Logs.getCreatedItemsID(i).then((link) => {
            //       createdInstanceIds.consortia.push(link.split('/')[5]);
            //     });
            //   }

            //   ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            //   DataImport.waitLoading();
            //   DataImport.verifyUploadState();
            //   DataImport.uploadFileAndRetry(marcFiles[1].marc, marcFiles[1].fileNameImported);
            //   JobProfiles.waitFileIsUploaded();
            //   JobProfiles.waitLoadingList();
            //   JobProfiles.search(marcFiles[1].jobProfileToRun);
            //   JobProfiles.runImportFile();
            //   JobProfiles.waitFileIsImported(marcFiles[1].fileNameImported);
            //   Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            //   Logs.openFileDetails(marcFiles[1].fileNameImported);
            //   for (let i = 0; i < marcFiles[1].numberOftitles; i++) {
            //     Logs.getCreatedItemsID(i).then((link) => {
            //       createdInstanceIds.college.push(link.split('/')[5]);
            //     });
            //   }
            // });

            cy.setTenant(Affiliations.College);
            const collegeLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(collegeLocationData).then((location) => {
              locations.college = location;
            });
            cy.createLoanType({
              name: getTestEntityValue('type'),
            }).then((loanType) => {
              loanTypeIds.college = loanType.id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((matType) => {
              materialTypeIds.college = matType.id;
            });

            cy.setTenant(Affiliations.University);
            const universityLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(universityLocationData).then((location) => {
              locations.university = location;
            });
            cy.createLoanType({
              name: getTestEntityValue('type'),
            }).then((loanType) => {
              loanTypeIds.university = loanType.id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((matType) => {
              materialTypeIds.university = matType.id;
            });
          })
          .then(() => {
            testData.instances
              .filter((inst) => !inst.isMarc)
              .forEach((instance) => {
                createFolioInstance(instance.title, instance.instanceTenant);
              });
            testData.instances
              .filter((inst) => !inst.isMarc)
              .forEach((instance) => {
                addHoldingsRecord(instance.instanceId, Affiliations.College);
              });
            testData.instances
              .filter((inst) => !inst.isMarc)
              .forEach((instance) => {
                addHoldingsRecord(instance.instanceId, Affiliations.University);
              });
            testData.instances
              .filter((inst) => !inst.isMarc)
              .forEach((instance) => {
                addItemRecord(instance.instanceId, Affiliations.College);
              });
            testData.instances
              .filter((inst) => !inst.isMarc)
              .forEach((instance) => {
                addItemRecord(instance.instanceId, Affiliations.University);
              });

            cy.login(testData.userProperties.username, testData.userProperties.password).then(
              () => {
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
                cy.visit(TopMenu.inventoryPath);
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
        createdItemIds.college.forEach((id) => {
          InventoryItems.deleteItemViaApi(id);
        });
        createdHoldingsIds.college.forEach((id) => {
          InventoryHoldings.deleteHoldingRecordViaApi(id);
        });
        Locations.deleteViaApi(locations.college);
        cy.deleteLoanType(loanTypeIds.college);

        cy.setTenant(Affiliations.University);
        createdItemIds.university.forEach((id) => {
          InventoryItems.deleteItemViaApi(id);
        });
        createdHoldingsIds.university.forEach((id) => {
          InventoryHoldings.deleteHoldingRecordViaApi(id);
        });
        Locations.deleteViaApi(locations.university);
        cy.deleteLoanType(loanTypeIds.university);

        cy.setTenant(Affiliations.College);
        createdInstanceIds.college.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        cy.setTenant(Affiliations.University);
        createdInstanceIds.university.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        cy.resetTenant();
        createdInstanceIds.consortia.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C404353 Use "Held by" facet when browsing Call numbers in Consortia tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          InventorySearchAndFilter.clickAccordionByName(testData.heldByAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.heldByAccordionName);
          BrowseSubjects.browse(callNumberPrefix);
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'Yes',
          //   false,
          // );
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'No',
          //   false,
          // );
          // BrowseSubjects.browse(callNumber);
          // BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          // BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          // InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'Yes',
          //   false,
          // );
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'No',
          //   false,
          // );
          // BrowseCallNumber.clickOnResult(callNumber);
          // InventoryInstances.waitLoading();
          // InventoryInstance.verifySharedIconByTitle(testData.instances[0].title);
          // InventoryInstance.verifySharedIconByTitle(testData.instances[1].title);
          // InventoryInstance.verifySharedIconByTitle(testData.instances[4].title);
          // InventoryInstance.verifySharedIconByTitle(testData.instances[5].title);
          // InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[2].title);
          // InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[3].title);
          // InventorySearchAndFilter.verifyNumberOfSearchResults(6);

          // InventorySearchAndFilter.switchToBrowseTab();
          // InventorySearchAndFilter.verifyCallNumberBrowseNotEmptyPane();
          // InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          // InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          // BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          // BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          // InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'Yes',
          //   false,
          // );
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'No',
          //   true,
          // );
          // BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          // BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '2');
          // BrowseCallNumber.clickOnResult(callNumber);
          // InventoryInstances.waitLoading();
          // InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[2].title);
          // InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[3].title);
          // InventorySearchAndFilter.verifyNumberOfSearchResults(2);

          // InventorySearchAndFilter.switchToBrowseTab();
          // InventorySearchAndFilter.verifyCallNumberBrowseNotEmptyPane();
          // InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          // InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'No',
          //   true,
          // );
          // BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          // BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '2');
          // InventorySearchAndFilter.selectOptionInExpandedFilter(
          //   testData.sharedAccordionName,
          //   'No',
          //   false,
          // );
          // BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          // BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          // InventorySearchAndFilter.selectOptionInExpandedFilter(
          //   testData.sharedAccordionName,
          //   'Yes',
          // );
          // BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          // BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '4');
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'Yes',
          //   true,
          // );
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'No',
          //   false,
          // );
          // BrowseCallNumber.clickOnResult(callNumber);
          // InventoryInstances.waitLoading();
          // InventoryInstance.verifySharedIconByTitle(testData.instances[0].title);
          // InventoryInstance.verifySharedIconByTitle(testData.instances[1].title);
          // InventoryInstance.verifySharedIconByTitle(testData.instances[4].title);
          // InventoryInstance.verifySharedIconByTitle(testData.instances[5].title);
          // InventorySearchAndFilter.verifyNumberOfSearchResults(4);

          // InventorySearchAndFilter.switchToBrowseTab();
          // InventorySearchAndFilter.verifyCallNumberBrowseNotEmptyPane();
          // InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          // InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'Yes',
          //   true,
          // );
          // BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          // BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '4');
          // InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          // BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          // BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'Yes',
          //   true,
          // );
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'No',
          //   true,
          // );
          // BrowseCallNumber.clickOnResult(callNumber);
          // InventoryInstances.waitLoading();
          // InventoryInstance.verifySharedIconByTitle(testData.instances[0].title);
          // InventoryInstance.verifySharedIconByTitle(testData.instances[1].title);
          // InventoryInstance.verifySharedIconByTitle(testData.instances[4].title);
          // InventoryInstance.verifySharedIconByTitle(testData.instances[5].title);
          // InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[2].title);
          // InventoryInstance.verifySharedIconAbsentByTitle(testData.instances[3].title);
          // InventorySearchAndFilter.verifyNumberOfSearchResults(6);

          // InventorySearchAndFilter.switchToBrowseTab();
          // InventorySearchAndFilter.verifyCallNumberBrowseNotEmptyPane();
          // InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          // InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          // BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
          // BrowseCallNumber.checkNumberOfTitlesForRow(callNumber, '6');
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'Yes',
          //   true,
          // );
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.sharedAccordionName,
          //   'No',
          //   true,
          // );
        },
      );
    });
  });
});
