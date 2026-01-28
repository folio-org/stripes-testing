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
                callNumber: `${callNumberPrefix} Inst08 Call MI`,
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
      };
      const createdHoldingsIds = [];
      const createdItemIds = [];
      let location;
      let loanTypeId;
      let materialTypeId;
      let collegeSourceId;

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
          sourceId: collegeSourceId,
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
            InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
              (holdingSources) => {
                collegeSourceId = holdingSources[0].id;
              },
            );
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
                cy.createSimpleMarcBibViaAPI(instance.title).then((bibId) => {
                  createdInstanceIds[targetTenant].push(bibId);
                  testData.instances[
                    testData.instances.findIndex((inst) => inst.title === instance.title)
                  ].instanceId = bibId;
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
        cy.resetTenant();
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        InventorySearchAndFilter.selectBrowseCallNumbers();
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
        { tags: ['criticalPathECS', 'spitfire', 'C410759'] },
        () => {
          cy.resetTenant();
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber);
          });
          InventorySearchAndFilter.browseSearch(callNumberPrefix);
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.browseSearch(allNonVisibleCNs[0]);
          BrowseCallNumber.checkNonExactSearchResult(allNonVisibleCNs[0]);
          allNonVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber, false);
          });
          InventorySearchAndFilter.browseSearch(allVisibleCNs[0]);
          BrowseCallNumber.valueInResultTableIsHighlighted(allVisibleCNs[0]);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          BrowseCallNumber.clickOnResult(allVisibleCNs[0]);
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.instances[0].title);
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventoryInstance.verifySharedIcon();
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyCallNumberBrowsePane();
          BrowseCallNumber.valueInResultTableIsHighlighted(allVisibleCNs[0]);
          allVisibleCNs.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          BrowseCallNumber.clickOnResult(allVisibleCNs[2]);
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.instances[2].title);
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventoryInstance.verifySharedIcon();
        },
      );
    });
  });
});
