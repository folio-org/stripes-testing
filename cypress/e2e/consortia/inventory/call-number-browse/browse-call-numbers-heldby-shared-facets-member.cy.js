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
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const instancePrefix = 'C404360Auto Instance';
      const callNumberPrefix = `C404360Auto${getRandomLetters(10)}`;
      const testData = {
        instances: [
          {
            title: `${instancePrefix} 1`,
            instanceTenant: Affiliations.Consortia,
            isMarc: true,
            holdings: {
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 1`,
              },
              university: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M2 Shared 1`,
              },
            },
          },
          {
            title: `${instancePrefix} 2`,
            instanceTenant: Affiliations.Consortia,
            isMarc: false,
            holdings: {
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 2`,
              },
              university: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M2 Shared 2`,
              },
            },
          },
          {
            title: `${instancePrefix} 3`,
            instanceTenant: Affiliations.Consortia,
            isMarc: true,
            holdings: {
              college: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M1 Shared 3`,
              },
              university: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M2 Shared 3`,
              },
            },
          },
          {
            title: `${instancePrefix} 4`,
            instanceTenant: Affiliations.Consortia,
            isMarc: false,
            holdings: {
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 4`,
              },
              university: {
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
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 5`,
              },
            },
          },
          {
            title: `${instancePrefix} 6`,
            instanceTenant: Affiliations.Consortia,
            isMarc: false,
            holdings: {
              university: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M2 Shared 6`,
              },
            },
          },
          {
            title: `${instancePrefix} 7`,
            instanceTenant: Affiliations.College,
            isMarc: true,
            holdings: {
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Local 7`,
              },
            },
          },
          {
            title: `${instancePrefix} 8`,
            instanceTenant: Affiliations.University,
            isMarc: false,
            holdings: {
              university: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} M2 Local 8`,
              },
            },
          },
          {
            title: `${instancePrefix} 9`,
            instanceTenant: Affiliations.Consortia,
            isMarc: true,
            holdings: {},
          },
        ],
        heldByAccordionName: 'Held by',
        sharedAccordionName: 'Shared',
        callNumberBrowseoption: 'Call numbers (all)',
      };
      const allVisibleCNs = [
        `${callNumberPrefix} M1 Shared 1`,
        `${callNumberPrefix} M1 Shared 2`,
        `${callNumberPrefix} M1 Shared 3`,
        `${callNumberPrefix} M1 Shared 4`,
        `${callNumberPrefix} M1 Shared 5`,
        `${callNumberPrefix} M1 Local 7`,
        `${callNumberPrefix} M2 Shared 1`,
        `${callNumberPrefix} M2 Shared 2`,
        `${callNumberPrefix} M2 Shared 3`,
        `${callNumberPrefix} M2 Shared 4`,
        `${callNumberPrefix} M2 Shared 6`,
      ];
      const getCollegeCNs = (cns) => cns.filter((cn) => cn.includes(' M1 '));
      const getUniversityCNs = (cns) => cns.filter((cn) => cn.includes(' M2 '));
      const getSharedCNs = (cns) => cns.filter((cn) => cn.includes(' Shared '));
      const marcFiles = [
        {
          marc: 'testMarcBibC404360Shared.mrc',
          fileNameImported: `testMarcBibC404360Shared.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numberOftitles: 4,
        },
        {
          marc: 'testMarcBibC404360Local.mrc',
          fileNameImported: `testMarcBibC404360Local.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
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
      const holdingsSourceIds = {};

      function createFolioInstance(instanceTitle, tenantId) {
        const targetTenant = Object.keys(Affiliations)
          .find((key) => Affiliations[key] === tenantId)
          .toLowerCase();
        cy.setTenant(tenantId);
        InventoryInstance.createInstanceViaApi({
          instanceTitle,
        }).then((instanceData) => {
          createdInstanceIds[targetTenant].push(instanceData.instanceData.instanceId);
          testData.instances[
            testData.instances.findIndex((instance) => instance.title === instanceTitle)
          ].instanceId = instanceData.instanceData.instanceId;
        });
      }

      function addHoldingsRecord(instanceId, tenantId) {
        const instance =
          testData.instances[
            testData.instances.findIndex((inst) => inst.instanceId === instanceId)
          ];
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
            sourceId: holdingsSourceIds[targetTenant],
          }).then((holding) => {
            createdHoldingsIds[targetTenant].push(holding.id);
            instance.holdings[targetTenant].id = holding.id;
          });
        }
      }

      function addItemRecord(instanceId, tenantId) {
        const instance =
          testData.instances[
            testData.instances.findIndex((inst) => inst.instanceId === instanceId)
          ];
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

            DataImport.uploadFileViaApi(
              marcFiles[0].marc,
              marcFiles[0].fileNameImported,
              marcFiles[0].jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdInstanceIds.consortia.push(record.instance.id);
                cy.getInstanceById(record.instance.id).then((body) => {
                  testData.instances[
                    testData.instances.findIndex((instance) => instance.title === body.title)
                  ].instanceId = record.instance.id;
                });
              });
            });

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.inventoryAll.gui,
            ]);

            DataImport.uploadFileViaApi(
              marcFiles[1].marc,
              marcFiles[1].fileNameImported,
              marcFiles[1].jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdInstanceIds.college.push(record.instance.id);
                cy.getInstanceById(record.instance.id).then((body) => {
                  testData.instances[
                    testData.instances.findIndex((instance) => instance.title === body.title)
                  ].instanceId = record.instance.id;
                });
              });
            });

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
            InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
              (holdingSources) => {
                holdingsSourceIds.college = holdingSources[0].id;
              },
            );

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
            InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
              (holdingSources) => {
                holdingsSourceIds.university = holdingSources[0].id;
              },
            );
          })
          .then(() => {
            testData.instances
              .filter((inst) => !inst.isMarc)
              .forEach((instance) => {
                createFolioInstance(instance.title, instance.instanceTenant);
              });
          });
      });

      before(() => {
        testData.instances.forEach((instance) => {
          addHoldingsRecord(instance.instanceId, Affiliations.College);
        });
        testData.instances.forEach((instance) => {
          addHoldingsRecord(instance.instanceId, Affiliations.University);
        });
      });

      before(() => {
        testData.instances.forEach((instance) => {
          addItemRecord(instance.instanceId, Affiliations.College);
        });
        testData.instances.forEach((instance) => {
          addItemRecord(instance.instanceId, Affiliations.University);
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
        'C844863 Use "Held by" facet when browsing Call numbers in Consortia tenant (applying "Shared" facet) (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C844863'] },
        () => {
          cy.resetTenant();
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: '/',
            waiter: () => true,
          }).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.selectBrowseCallNumbers();
          });
          cy.setTenant(Affiliations.College);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber);
          });
          BrowseSubjects.browse(`${callNumberPrefix} M1 Shared 1`);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.clickAccordionByName(testData.heldByAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.heldByAccordionName);
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, false);
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.university, false);
          InventorySearchAndFilter.selectHeldByOption(tenantNames.college);
          getCollegeCNs(allVisibleCNs).forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.selectHeldByOption(tenantNames.university);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'Yes',
          );
          getSharedCNs(allVisibleCNs).forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'Yes',
            false,
          );
          InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          BrowseCallNumber.checkNonExactSearchResult(`${callNumberPrefix} M1 Shared 1`);
          BrowseCallNumber.checkValuePresentInResults(`${callNumberPrefix} M1 Local 7`);
          InventorySearchAndFilter.selectOptionInExpandedFilter(
            testData.sharedAccordionName,
            'Yes',
          );
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.selectHeldByOption(tenantNames.college, false);
          getUniversityCNs(allVisibleCNs).forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.clearFilter(testData.heldByAccordionName);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
        },
      );
    });
  });
});
