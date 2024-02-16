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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const instancePrefix = `C410759Auto Instance ${getRandomPostfix()}`;
      const callNumberPrefix = `C410759Auto${getRandomLetters(10)}`;
      const testData = {
        instances: [
          {
            title: `${instancePrefix} 1`,
            instanceTenant: Affiliations.Consortia,
            isMarc: false,
            holdings: {
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} Inst01 Call FH`,
              },
            },
          },
          {
            title: `${instancePrefix} 2`,
            instanceTenant: Affiliations.Consortia,
            isMarc: false,
            holdings: {
              college: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} Inst02 Call FI`,
              },
            },
          },
          {
            title: `${instancePrefix} 3`,
            instanceTenant: Affiliations.Consortia,
            isMarc: true,
            holdings: {
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} Inst03 Call MH`,
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
                callNumber: `${callNumberPrefix} Inst04 Call MI`,
              },
            },
          },
          {
            title: `${instancePrefix} 5`,
            instanceTenant: Affiliations.College,
            isMarc: false,
            holdings: {
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} Inst05 Call FH`,
              },
            },
          },
          {
            title: `${instancePrefix} 6`,
            instanceTenant: Affiliations.College,
            isMarc: false,
            holdings: {
              college: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix}  Inst06 Call FI`,
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
                callNumber: `${callNumberPrefix} Inst07 Call MH`,
              },
            },
          },
          {
            title: `${instancePrefix} 8`,
            instanceTenant: Affiliations.College,
            isMarc: true,
            holdings: {
              college: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} Inst8 Call MI`,
              },
            },
          },
        ],
        callNumberBrowseoption: 'Call numbers (all)',
      };
      const allVisibleCNs = [
        `${callNumberPrefix} Inst01 Call FH`,
        `${callNumberPrefix} Inst02 Call FI`,
        `${callNumberPrefix} Inst03 Call MH`,
        `${callNumberPrefix} Inst04 Call MI`,
      ];
      const createdInstanceIds = {
        consortia: [],
        college: [],
      };
      const createdHoldingsIds = [];
      const createdItemIds = [];
      let location;
      let loanTypeId;
      let materialTypeId;

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

      function addHoldingsRecordInCollege(instanceId) {
        const instance =
          testData.instances[
            testData.instances.findIndex((inst) => inst.instanceId === instanceId)
          ];
        cy.setTenant(Affiliations.College);
        InventoryHoldings.createHoldingRecordViaApi({
          instanceId,
          permanentLocationId: location.id,
          callNumber: instance.holdings.college.callNumberInHoldings
            ? instance.holdings.college.callNumber
            : null,
        }).then((holding) => {
          createdHoldingsIds.push(holding.id);
          instance.holdings.college.id = holding.id;
        });
      }

      function addItemRecordInCollege(instanceId) {
        const instance =
          testData.instances[
            testData.instances.findIndex((inst) => inst.instanceId === instanceId)
          ];
        cy.setTenant(Affiliations.College);
        InventoryItems.createItemViaApi({
          holdingsRecordId: instance.holdings.college.id,
          materialType: { id: materialTypeId },
          permanentLoanType: { id: loanTypeId },
          status: { name: 'Available' },
          itemLevelCallNumber: instance.holdings.college.callNumberInHoldings
            ? null
            : instance.holdings.college.callNumber,
        }).then((item) => {
          createdItemIds.push(item.id);
        });
      }

      before('Create user, data', () => {
        cy.getAdminToken();

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            testData.userProperties = userProperties;

            cy.setTenant(Affiliations.College);
            const collegeLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(collegeLocationData).then((loc) => {
              location = loc;
            });
            cy.createLoanType({
              name: getTestEntityValue('type'),
            }).then((loanType) => {
              loanTypeId = loanType.id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((matType) => {
              materialTypeId = matType.id;
            });
          })
          .then(() => {
            testData.instances
              .filter((inst) => !inst.isMarc)
              .forEach((instance) => {
                createFolioInstance(instance.title, instance.instanceTenant);
              });
            testData.instances
              .filter((inst) => inst.isMarc)
              .forEach((instance) => {
                const targetTenant = Object.keys(Affiliations)
                  .find((key) => Affiliations[key] === instance.instanceTenant)
                  .toLowerCase();
                cy.setTenant(instance.instanceTenant);
                cy.createSimpleMarcBibViaAPI(instance.title);
                QuickMarcEditor.getCreatedMarcBib(instance.title).then((bib) => {
                  createdInstanceIds[targetTenant].push(bib.id);
                  testData.instances[
                    testData.instances.findIndex((inst) => inst.title === instance.title)
                  ].instanceId = bib.id;
                });
              });
          });
      });

      before(() => {
        testData.instances.forEach((instance) => {
          addHoldingsRecordInCollege(instance.instanceId);
        });
      });

      before(() => {
        testData.instances.forEach((instance) => {
          addItemRecordInCollege(instance.instanceId);
        });
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.selectBrowseCallNumbers();
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);

        cy.setTenant(Affiliations.College);
        createdItemIds.forEach((id) => {
          InventoryItems.deleteItemViaApi(id);
        });
        createdHoldingsIds.forEach((id) => {
          InventoryHoldings.deleteHoldingRecordViaApi(id);
        });
        Locations.deleteViaApi(location);
        cy.deleteLoanType(loanTypeId);

        cy.setTenant(Affiliations.College);
        createdInstanceIds.college.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        cy.resetTenant();
        createdInstanceIds.consortia.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C410759 Call numbers from "Shared" Instance records are shown in the browse result list on Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          BrowseSubjects.browse(callNumberPrefix);
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          // InventorySearchAndFilter.clickAccordionByName(testData.heldByAccordionName);
          // InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.heldByAccordionName);
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.heldByAccordionName,
          //   tenantNames.college,
          //   false,
          // );
          // InventorySearchAndFilter.verifyCheckboxInAccordion(
          //   testData.heldByAccordionName,
          //   tenantNames.university,
          //   false,
          // );
          // InventorySearchAndFilter.selectOptionInExpandedFilter(
          //   testData.heldByAccordionName,
          //   tenantNames.college,
          // );
          // getCollegeCNs(allVisibleCNs).forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber);
          // });
          // InventorySearchAndFilter.selectOptionInExpandedFilter(
          //   testData.heldByAccordionName,
          //   tenantNames.university,
          // );
          // allVisibleCNs.forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber);
          // });
          // InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          // InventorySearchAndFilter.verifyAccordionByNameExpanded(testData.sharedAccordionName);
          // InventorySearchAndFilter.selectOptionInExpandedFilter(
          //   testData.sharedAccordionName,
          //   'Yes',
          // );
          // getSharedCNs(allVisibleCNs).forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber);
          // });
          // InventorySearchAndFilter.selectOptionInExpandedFilter(
          //   testData.sharedAccordionName,
          //   'Yes',
          //   false,
          // );
          // InventorySearchAndFilter.selectOptionInExpandedFilter(testData.sharedAccordionName, 'No');
          // BrowseCallNumber.checkNonExactSearchResult(`${callNumberPrefix} M1 Shared 1`);
          // BrowseCallNumber.checkValuePresentInResults(`${callNumberPrefix} M1 Local 7`);
          // InventorySearchAndFilter.selectOptionInExpandedFilter(
          //   testData.sharedAccordionName,
          //   'Yes',
          // );
          // allVisibleCNs.forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber);
          // });
          // InventorySearchAndFilter.selectOptionInExpandedFilter(
          //   testData.heldByAccordionName,
          //   tenantNames.college,
          //   false,
          // );
          // getUniversityCNs(allVisibleCNs).forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber);
          // });
          // InventorySearchAndFilter.clearFilter(testData.heldByAccordionName);
          // allVisibleCNs.forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber);
          // });
        },
      );
    });
  });
});
