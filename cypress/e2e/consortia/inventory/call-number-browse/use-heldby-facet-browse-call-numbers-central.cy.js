import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  INSTANCE_SOURCE_NAMES,
  ITEM_STATUS_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C402319_Instance_${randomPostfix}`;
      const callNumberPrefix = `AT_C402319_CallNumber_${randomPostfix}`;
      const heldbyAccordionName = 'Held by';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: true,
            },
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: true,
            },
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: false,
            },
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: true,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: true,
            },
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: true,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.University,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: false,
            },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdings: [
            {
              affiliation: Affiliations.College,
              callNumberInHoldings: true,
            },
          ],
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );

      const locations = {};
      const loanTypeIds = {};
      const materialTypeIds = {};
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402319');
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((loc) => {
              locations[Affiliations.College] = loc;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeIds[Affiliations.College] = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeIds[Affiliations.College] = res.id;
            });

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402319');
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((loc) => {
              locations[Affiliations.University] = loc;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeIds[Affiliations.University] = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeIds[Affiliations.University] = res.id;
            });
          })
          .then(() => {
            cy.resetTenant();
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402319');

            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              instancesData.forEach((instanceData, index) => {
                cy.setTenant(instanceData.affiliation);

                if (instanceData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: `${instanceTitles[index]}`,
                    },
                  }).then((createdInstanceData) => {
                    instanceData.instanceId = createdInstanceData.instanceId;
                  });
                } else {
                  const marcInstanceFields = [
                    {
                      tag: '008',
                      content: QuickMarcEditor.defaultValid008Values,
                    },
                    {
                      tag: '245',
                      content: `$a ${instanceTitles[index]}`,
                      indicators: ['1', '1'],
                    },
                  ];
                  cy.createMarcBibliographicViaAPI(
                    QuickMarcEditor.defaultValidLdr,
                    marcInstanceFields,
                  ).then((instanceId) => {
                    instanceData.instanceId = instanceId;
                  });
                }
              });
            });
          })
          .then(() => {
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              instancesData.forEach((instanceData, instanceIndex) => {
                instanceData.holdings.forEach((holding, holdingsIndex) => {
                  cy.setTenant(holding.affiliation);
                  const holdingsData = {
                    instanceId: instanceData.instanceId,
                    permanentLocationId: locations[holding.affiliation].id,
                    sourceId: folioSource.id,
                  };
                  const currentCallNumber = `${callNumberPrefix}_${instanceIndex}_${holdingsIndex}`;
                  holding.callNumberValue = currentCallNumber;
                  if (holding.callNumberInHoldings) {
                    holdingsData.callNumber = currentCallNumber;
                  }
                  InventoryHoldings.createHoldingRecordViaApi(holdingsData).then(
                    (createdHoldings) => {
                      const itemData = {
                        holdingsRecordId: createdHoldings.id,
                        materialType: { id: materialTypeIds[holding.affiliation] },
                        permanentLoanType: { id: loanTypeIds[holding.affiliation] },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      };
                      if (!holding.callNumberInHoldings) {
                        itemData.itemLevelCallNumber = currentCallNumber;
                      }
                      InventoryItems.createItemViaApi(itemData);
                    },
                  );
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
              callNumberTypes: [],
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
      });

      it(
        'C402319 Use "Held by" facet for browse call numbers from "Central" tenant via "Call numbers (all)" option (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C402319'] },
        () => {
          const allVisibleCallNumbers = instancesData
            .filter((record) => record.affiliation === Affiliations.Consortia)
            .flatMap((record) => record.holdings)
            .map((holding) => holding.callNumberValue);
          const visibleCallNumbersCollege = instancesData
            .filter((record) => record.affiliation === Affiliations.Consortia)
            .flatMap((record) => record.holdings)
            .filter((holding) => holding.affiliation === Affiliations.College)
            .map((holding) => holding.callNumberValue);
          const visibleCallNumbersUniversity = instancesData
            .flatMap((record) => record.holdings)
            .filter((holding) => holding.affiliation === Affiliations.University)
            .map((holding) => holding.callNumberValue);

          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
          InventorySearchAndFilter.verifyBrowseResultListExists(false);
          InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);

          InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(heldbyAccordionName);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            false,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.university,
            false,
          );
          InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName, false);

          allVisibleCallNumbers.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber);
          });

          InventorySearchAndFilter.browseSearch(allVisibleCallNumbers[9]);
          BrowseCallNumber.valueInResultTableIsHighlighted(allVisibleCallNumbers[9]);
          allVisibleCallNumbers.slice(4, 11).forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber);
          });
          InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            false,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.university,
            false,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionCountGreaterOrEqual(
            heldbyAccordionName,
            tenantNames.college,
            visibleCallNumbersCollege.length,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionCountGreaterOrEqual(
            heldbyAccordionName,
            tenantNames.university,
            visibleCallNumbersUniversity.length,
          );

          InventorySearchAndFilter.selectMultiSelectFilterOption(
            heldbyAccordionName,
            tenantNames.college,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            heldbyAccordionName,
            tenantNames.university,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.university,
            true,
          );
          BrowseCallNumber.valueInResultTableIsHighlighted(allVisibleCallNumbers[9]);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionCountGreaterOrEqual(
            heldbyAccordionName,
            tenantNames.college,
            visibleCallNumbersCollege.length,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionCountGreaterOrEqual(
            heldbyAccordionName,
            tenantNames.university,
            visibleCallNumbersUniversity.length,
          );
          BrowseCallNumber.resultRowsIsInRequiredOder(allVisibleCallNumbers.slice(4, 11));

          BrowseCallNumber.clickPreviousPaginationButton();
          BrowseCallNumber.resultRowsIsInRequiredOder(allVisibleCallNumbers.slice(0, 4));

          InventorySearchAndFilter.browseSearch(callNumberPrefix);
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );

          cy.reload();
          InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
          BrowseCallNumber.checkNonExactSearchResult(callNumberPrefix);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            heldbyAccordionName,
            tenantNames.college,
            true,
          );
        },
      );
    });
  });
});
