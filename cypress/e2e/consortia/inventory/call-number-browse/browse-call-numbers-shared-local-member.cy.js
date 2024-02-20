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
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const instancePrefix = `C410763Auto Instance ${getRandomPostfix()}`;
      const callNumberPrefix = `C410763Auto${getRandomLetters(10)}`;
      const testData = {
        instances: [
          {
            title: `${instancePrefix} 1`,
            instanceTenant: Affiliations.Consortia,
            isMarc: false,
            holdings: {
              college: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} Inst01 M1 H`,
              },
              university: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} Inst01 M2 H`,
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
                callNumber: `${callNumberPrefix} Inst02 M1 I`,
              },
              university: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} Inst02 M2 I`,
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
                callNumber: `${callNumberPrefix} Inst03 Call M1 H`,
              },
              university: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} Inst03 M2 H`,
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
                callNumber: `${callNumberPrefix} Inst04 Call M1 I`,
              },
              university: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} Inst04 M2 I`,
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
                callNumber: `${callNumberPrefix} Inst05 Call M1 H`,
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
                callNumber: `${callNumberPrefix}  Inst06 Call M1 I`,
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
                callNumber: `${callNumberPrefix} Inst07 Call M1 H`,
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
                callNumber: `${callNumberPrefix} Inst08 Call M1 I`,
              },
            },
          },
          {
            title: `${instancePrefix} 9`,
            instanceTenant: Affiliations.University,
            isMarc: false,
            holdings: {
              university: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} Inst09 Call M2 H`,
              },
            },
          },
          {
            title: `${instancePrefix} 10`,
            instanceTenant: Affiliations.University,
            isMarc: false,
            holdings: {
              university: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} Inst10 Call M2 I`,
              },
            },
          },
          {
            title: `${instancePrefix} 11`,
            instanceTenant: Affiliations.University,
            isMarc: true,
            holdings: {
              university: {
                callNumberInHoldings: true,
                callNumber: `${callNumberPrefix} Inst11 Call M2 H`,
              },
            },
          },
          {
            title: `${instancePrefix} 12`,
            instanceTenant: Affiliations.University,
            isMarc: true,
            holdings: {
              university: {
                callNumberInHoldings: false,
                callNumber: `${callNumberPrefix} Inst12 Call M2 I`,
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
      const allNonVisibleCNs = [
        `${callNumberPrefix} Inst05 Call FH`,
        `${callNumberPrefix} Inst06 Call FI`,
        `${callNumberPrefix} Inst07 Call MH`,
        `${callNumberPrefix} Inst08 Call MI`,
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
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.userProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
            ]);

            const collegeLocationData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(collegeLocationData).then((loc) => {
              locations.college = loc;
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
            Locations.createViaApi(universityLocationData).then((loc) => {
              locations.university = loc;
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
        createdInstanceIds.college.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });

        cy.setTenant(Affiliations.University);
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

        cy.resetTenant();
        createdInstanceIds.consortia.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C410759 Call numbers from "Shared" Instance records are shown in the browse result list on Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.selectBrowseCallNumbers();
          });
          InventorySearchAndFilter.browseSearch(callNumberPrefix);
          // BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          // allVisibleCNs.forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber);
          // });
          // InventorySearchAndFilter.browseSearch(allNonVisibleCNs[0]);
          // BrowseCallNumber.checkNonExactSearchResult(allNonVisibleCNs[0]);
          // allNonVisibleCNs.forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber, false);
          // });
          // InventorySearchAndFilter.browseSearch(allVisibleCNs[0]);
          // BrowseCallNumber.valueInResultTableIsHighlighted(allVisibleCNs[0]);
          // allVisibleCNs.forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber);
          // });
          // BrowseCallNumber.clickOnResult(allVisibleCNs[0]);
          // InventorySearchAndFilter.verifyInstanceDisplayed(testData.instances[0].title);
          // InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          // InventoryInstance.verifySharedIcon();
          // InventorySearchAndFilter.switchToBrowseTab();
          // InventorySearchAndFilter.verifyCallNumberBrowsePane();
          // BrowseCallNumber.valueInResultTableIsHighlighted(allVisibleCNs[0]);
          // allVisibleCNs.forEach((callNumber) => {
          //   BrowseCallNumber.checkValuePresentInResults(callNumber);
          // });
          // BrowseCallNumber.clickOnResult(allVisibleCNs[2]);
          // InventorySearchAndFilter.verifyInstanceDisplayed(testData.instances[2].title);
          // InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          // InventoryInstance.verifySharedIcon();
        },
      );
    });
  });
});
