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
      const instancePrefix = 'C404353Auto Instance';
      const callNumberPrefix = `C404353Auto${getRandomLetters(10)}`;
      const Dropdowns = {
        HELDBY: 'Held by',
      };
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
            isMarc: true,
            holdings: {
              college: {
                callNumberInHoldings: false,
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
            isMarc: false,
            holdings: {
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 3`,
              },
              university: {
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
              college: {
                callNumberInHoldings: false,
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
              university: {
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
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M1 Shared 6`,
              },
              university: {
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
              college: {
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
              university: {
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
              college: {
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
              college: {
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
              university: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} M2 Local 11`,
              },
            },
          },
        ],
        heldByAccordionName: 'Held by',
        callNumberBrowseoption: 'Call numbers (all)',
      };
      const allVisibleCNs = [
        `${callNumberPrefix} M1 Shared 1`,
        `${callNumberPrefix} M1 Shared 2`,
        `${callNumberPrefix} M1 Shared 3`,
        `${callNumberPrefix} M1 Shared 4`,
        `${callNumberPrefix} M1 Shared 5`,
        `${callNumberPrefix} M1 Shared 6`,
        `${callNumberPrefix} M1 Shared 7`,
        `${callNumberPrefix} M1 Local 9`,
        `${callNumberPrefix} M1 Local 10`,
        `${callNumberPrefix} M2 Shared 1`,
        `${callNumberPrefix} M2 Shared 2`,
        `${callNumberPrefix} M2 Shared 3`,
        `${callNumberPrefix} M2 Shared 4`,
        `${callNumberPrefix} M2 Shared 5`,
        `${callNumberPrefix} M2 Shared 6`,
        `${callNumberPrefix} M2 Shared 8`,
      ];
      const visibleCollegeCNs = allVisibleCNs.filter((cn) => cn.includes(' M1 '));
      const visibleUniversityCNs = allVisibleCNs.filter((cn) => cn.includes(' M2 '));
      const marcFiles = [
        {
          marc: 'testMarcBibC404353Shared.mrc',
          fileNameImported: `testMarcBibC404353Shared.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numberOftitles: 5,
        },
        {
          marc: 'testMarcBibC404353Local.mrc',
          fileNameImported: `testMarcBibC404353Local.${getRandomPostfix()}.mrc`,
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

            cy.setTenant(Affiliations.Consortia);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.inventoryAll.gui,
            ]);
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
        cy.then(() => {
          testData.instances.forEach((instance) => {
            addHoldingsRecord(instance.instanceId, Affiliations.College);
          });
          testData.instances.forEach((instance) => {
            addHoldingsRecord(instance.instanceId, Affiliations.University);
          });
        }).then(() => {
          testData.instances.forEach((instance) => {
            addItemRecord(instance.instanceId, Affiliations.College);
          });
          testData.instances.forEach((instance) => {
            addItemRecord(instance.instanceId, Affiliations.University);
          });
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);

        cy.withinTenant(Affiliations.College, () => {
          createdItemIds.college.forEach((id) => {
            InventoryItems.deleteItemViaApi(id);
          });
          createdHoldingsIds.college.forEach((id) => {
            InventoryHoldings.deleteHoldingRecordViaApi(id);
          });
          Locations.deleteViaApi(locations.college);
          cy.deleteLoanType(loanTypeIds.college);
          createdInstanceIds.college.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        cy.withinTenant(Affiliations.University, () => {
          createdItemIds.university.forEach((id) => {
            InventoryItems.deleteItemViaApi(id);
          });
          createdHoldingsIds.university.forEach((id) => {
            InventoryHoldings.deleteHoldingRecordViaApi(id);
          });
          Locations.deleteViaApi(locations.university);
          cy.deleteLoanType(loanTypeIds.university);
          createdInstanceIds.university.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        cy.withinTenant(Affiliations.Consortia, () => {
          createdInstanceIds.consortia.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        });
      });

      it(
        'C404353 Use "Held by" facet when browsing Call numbers in Consortia tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C404353'] },
        () => {
          cy.resetTenant();
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.selectBrowseCallNumbers();
          });
          cy.wait(2_000);
          cy.setTenant(Affiliations.College);
          BrowseSubjects.browse(callNumberPrefix);
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELDBY);
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
          visibleCollegeCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.university, false);
          InventorySearchAndFilter.selectHeldByOption(tenantNames.university);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.selectHeldByOption(tenantNames.college, false);
          visibleUniversityCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          BrowseSubjects.browse(`${callNumberPrefix} M2 Shared 1`);
          BrowseCallNumber.valueInResultTableIsHighlighted(`${callNumberPrefix} M2 Shared 1`);
          visibleUniversityCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          BrowseSubjects.browse(`${callNumberPrefix} M1 Shared 1`);
          BrowseCallNumber.checkNonExactSearchResult(`${callNumberPrefix} M1 Shared 1`);
          visibleUniversityCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          BrowseSubjects.browse(`${callNumberPrefix} M2 Local 11`);
          BrowseCallNumber.checkNonExactSearchResult(`${callNumberPrefix} M2 Local 11`);
          visibleUniversityCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.selectHeldByOption(tenantNames.university, false);
          InventorySearchAndFilter.selectHeldByOption(tenantNames.college, true);
          BrowseSubjects.browse(`${callNumberPrefix} M1 Shared 6`);
          BrowseCallNumber.valueInResultTableIsHighlighted(`${callNumberPrefix} M1 Shared 6`);
          visibleCollegeCNs
            .filter((cn, index) => index < 7)
            .forEach((callNumber) => {
              BrowseCallNumber.checkValuePresentInResults(callNumber);
            });
          BrowseCallNumber.clickPreviousPaginationButton();
          visibleCollegeCNs
            .filter((cn, index) => index >= 7)
            .forEach((callNumber) => {
              BrowseCallNumber.checkValuePresentInResults(callNumber);
            });
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
          BrowseCallNumber.clickNextPaginationButton();
          visibleCollegeCNs
            .filter((cn, index) => index < 7)
            .forEach((callNumber) => {
              BrowseCallNumber.checkValuePresentInResults(callNumber);
            });
          BrowseCallNumber.valueInResultTableIsHighlighted(`${callNumberPrefix} M1 Shared 6`);
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
          InventorySearchAndFilter.clearFilter(testData.heldByAccordionName);
          allVisibleCNs
            .filter((cn, index) => index < 7 && index > 8)
            .forEach((callNumber) => {
              BrowseCallNumber.checkValuePresentInResults(callNumber);
            });
          InventorySearchAndFilter.clickResetAllButton();
          InventorySearchAndFilter.selectBrowseCallNumbers();
          cy.wait(2_000);
          BrowseSubjects.browse(callNumberPrefix);
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELDBY);
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
          visibleCollegeCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          BrowseSubjects.browse('C404353Auto');
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
          visibleCollegeCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.selectHeldByOption(tenantNames.university);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          cy.reload();
          cy.wait(2_000);
          InventorySearchAndFilter.clickAccordionByName(Dropdowns.HELDBY);
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.college, true);
          InventorySearchAndFilter.checkHeldByOptionSelected(tenantNames.university, true);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
        },
      );
    });
  });
});
