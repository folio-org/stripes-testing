import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C414983_Instance_${randomPostfix}`,
      callNumberPrefix: `AT_C414983_CallNumber_${randomPostfix}`,
      callNumberTypePrefix: `AT_C414983_LocalType_${randomPostfix}`,
      callNumberOption: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
    };
    const callNumbers = Array.from(
      { length: 8 },
      (_, i) => `${testData.callNumberPrefix}_${i + 1}`,
    );
    const localCallNumberTypes = [
      { name: `${testData.callNumberTypePrefix}_1` },
      { name: `${testData.callNumberTypePrefix}_2` },
      { name: `${testData.callNumberTypePrefix}_3` },
    ];
    const instances = [
      {
        title: `${testData.instanceTitlePrefix}_1`,
        callNumbers: [
          { value: callNumbers[0], inHoldings: true, type: localCallNumberTypes[0] },
          { value: callNumbers[1], inHoldings: false, type: localCallNumberTypes[0] },
        ],
      },
      {
        title: `${testData.instanceTitlePrefix}_2`,
        callNumbers: [{ value: callNumbers[2], inHoldings: true, type: localCallNumberTypes[0] }],
      },
      {
        title: `${testData.instanceTitlePrefix}_3`,
        callNumbers: [{ value: callNumbers[3], inHoldings: false, type: localCallNumberTypes[0] }],
      },
      {
        title: `${testData.instanceTitlePrefix}_4`,
        callNumbers: [{ value: callNumbers[4], inHoldings: true, type: localCallNumberTypes[1] }],
      },
      {
        title: `${testData.instanceTitlePrefix}_5`,
        callNumbers: [
          { value: callNumbers[5], inHoldings: false, type: localCallNumberTypes[1] },
          { value: callNumbers[6], inHoldings: false, type: localCallNumberTypes[2] },
        ],
      },
      {
        title: `${testData.instanceTitlePrefix}_6`,
        callNumbers: [{ value: callNumbers[7], inHoldings: false, type: localCallNumberTypes[2] }],
      },
    ];
    let instanceTypeId;
    let locationId;
    let holdingsSourceId;
    let loanTypeId;
    let materialTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C414983');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          locationId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          holdingsSourceId = folioSource.id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
          materialTypeId = matType.id;
        });
        localCallNumberTypes.forEach((localCallNumberType) => {
          CallNumberTypes.createCallNumberTypeViaApi(localCallNumberType).then(
            (callNumberTypeId) => {
              localCallNumberType.id = callNumberTypeId;
            },
          );
        });
      })
        .then(() => {
          instances.forEach((instance) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instance.title,
              },
            }).then((instanceData) => {
              instance.id = instanceData.instanceId;

              instance.callNumbers.forEach((callNumber) => {
                const holdingsParams = {
                  instanceId: instance.id,
                  permanentLocationId: locationId,
                  sourceId: holdingsSourceId,
                };
                if (callNumber.inHoldings) {
                  holdingsParams.callNumber = callNumber.value;
                  holdingsParams.callNumberTypeId = callNumber.type.id;
                }
                InventoryHoldings.createHoldingRecordViaApi(holdingsParams).then((holdingData) => {
                  const holdingsId = holdingData.id;
                  const itemParams = {
                    holdingsId,
                    itemBarcode: uuid(),
                    materialTypeId,
                    permanentLoanTypeId: loanTypeId,
                  };
                  if (!callNumber.inHoldings) {
                    itemParams.itemLevelCallNumber = callNumber.value;
                    itemParams.itemLevelCallNumberTypeId = callNumber.type.id;
                  }
                  ItemRecordNew.createViaApi(itemParams);
                });
              });
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitlePrefix);
      localCallNumberTypes.forEach((type) => {
        CallNumberTypes.deleteLocalCallNumberTypeViaApi(type.id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C414983 Browse for "Local" call numbers when more than 2 "Local" call number types exist (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C414983'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        callNumbers.forEach((callNumber) => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumber);
        });

        InventorySearchAndFilter.selectBrowseCallNumbers();
        BrowseContributors.browse(callNumbers[1]);
        BrowseCallNumber.checkSearchResultsTable();
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[1]);
        callNumbers.forEach((callNumber) => {
          BrowseCallNumber.checkValuePresentInResults(callNumber);
        });
      },
    );
  });
});
