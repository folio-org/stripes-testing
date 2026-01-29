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
import BrowseClassifications from '../../../../support/fragments/inventory/search/browseClassifications';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C404373_Instance_${randomPostfix}`;
      const callNumberPrefix = `AT_C404373_CallNumber_${randomPostfix}`;
      const sharedAccordionName = 'Shared';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const callNumbers = Array.from(
        { length: instancesData.length },
        (_, i) => `${callNumberPrefix}_${i}`,
      );

      let location;
      let loanTypeId;
      let materialTypeId;
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404373');
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((loc) => {
              location = loc;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeId = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeId = res.id;
            });
          })
          .then(() => {
            cy.resetTenant();
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404373');

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
            cy.setTenant(Affiliations.College);
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              instancesData.forEach((instanceData, instanceIndex) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceData.instanceId,
                  permanentLocationId: location.id,
                  sourceId: folioSource.id,
                }).then((createdHoldings) => {
                  InventoryItems.createItemViaApi({
                    holdingsRecordId: createdHoldings.id,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    itemLevelCallNumber: callNumbers[instanceIndex],
                  });
                });
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
              callNumberTypes: [],
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
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

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
      });

      it(
        'C404373 Apply "Shared" facet when Browse for call number without executed search (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C404373'] },
        () => {
          callNumbers.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber);
          });

          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );

          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          BrowseCallNumber.clickOnResultByRowIndex(1);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkNoSharedInstancesInResultList();

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          InventorySearchAndFilter.verifyBrowseResultListExists(false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          BrowseCallNumber.clickOnResultByRowIndex(1);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyResultListExists();
          cy.wait(2000);
          InventorySearchAndFilter.checkSharedInstancesInResultList();

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          BrowseClassifications.checkPaginationButtonsShown();
          BrowseClassifications.getNextPaginationButtonState().then((nextEnabled) => {
            BrowseClassifications.getPreviousPaginationButtonState().then((previousEnabled) => {
              if (nextEnabled || previousEnabled) {
                if (nextEnabled) BrowseCallNumber.clickNextPaginationButton();
                else if (previousEnabled) BrowseCallNumber.clickPreviousPaginationButton();
                cy.wait(2000);

                InventorySearchAndFilter.verifyBrowseResultListExists();
                InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
                  sharedAccordionName,
                );
                InventorySearchAndFilter.verifyCheckboxInAccordion(
                  sharedAccordionName,
                  'Yes',
                  true,
                );
                InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
              }
            });
          });
        },
      );
    });
  });
});
