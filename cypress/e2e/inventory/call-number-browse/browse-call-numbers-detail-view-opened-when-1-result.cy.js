import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../support/fragments/inventory/instanceRecordView';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C411507_Instance_${randomPostfix}`,
      callNumberPrefix: `AT_C411507_CallNumber_${randomPostfix}`,
      actionsOptionsToCheck: [
        actionsMenuOptions.moveItemsWithinAnInstance,
        actionsMenuOptions.moveHoldingsItemsToAnotherInstance,
        actionsMenuOptions.edit,
        actionsMenuOptions.duplicate,
      ],
    };
    const instanceTitles = [
      `${testData.instanceTitlePrefix} A`,
      `${testData.instanceTitlePrefix} B`,
    ];
    const callNumbers = [`${testData.callNumberPrefix} A`, `${testData.callNumberPrefix} B`];
    const marcInstanceFields = [
      {
        tag: '008',
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: '245',
        content: `$a ${instanceTitles[1]}`,
        indicators: ['1', '1'],
      },
      {
        tag: '600',
        content: `$a ${callNumbers[1]}`,
        indicators: ['\\', '\\'],
      },
    ];
    const instanceIds = [];
    const holdingsIds = [];
    let locationId;
    let holdingsSourceId;
    let loanTypeId;
    let materialTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411507');

      cy.then(() => {
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
      })
        .then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: instanceTitles[0],
              },
            }).then((instanceData) => {
              instanceIds.push(instanceData.instanceId);

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                instanceIds.push(instanceId);
              });
            });
          });
        })
        .then(() => {
          instanceIds.forEach((id) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: id,
              permanentLocationId: locationId,
              sourceId: holdingsSourceId,
            }).then((holdingData) => {
              holdingsIds.push(holdingData.id);
            });
          });
        })
        .then(() => {
          callNumbers.forEach((value, index) => {
            ItemRecordNew.createViaApi({
              holdingsId: holdingsIds[index],
              itemBarcode: uuid(),
              materialTypeId,
              permanentLoanTypeId: loanTypeId,
              itemLevelCallNumber: value,
            });
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryMoveItems.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C411507 Browse (call number): Show instance result in third pane when Number of titles = 1 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C411507'] },
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
        InventorySearchAndFilter.verifySearchButtonDisabled();

        InventorySearchAndFilter.fillInBrowseSearch(callNumbers[0]);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(callNumbers[0]);
        InventorySearchAndFilter.verifySearchButtonDisabled(false);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.checkSearchResultsTable();
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumbers[0], 1);

        BrowseCallNumber.clickOnResult(callNumbers[0]);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
        InventoryInstance.verifyInstanceTitle(instanceTitles[0]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.FOLIO);
        InstanceRecordView.clickActionsButton();
        testData.actionsOptionsToCheck.forEach((option) => {
          InstanceRecordView.validateOptionInActionsMenu(option, true, false);
        });

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.verifyRowShownAsSelected(callNumbers[0]);

        InventorySearchAndFilter.fillInBrowseSearch(callNumbers[1]);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(callNumbers[1]);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.checkSearchResultsTable();
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumbers[1], 1);

        BrowseCallNumber.clickOnResult(callNumbers[1]);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
        InventoryInstance.verifyInstanceTitle(instanceTitles[1]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InstanceRecordView.clickActionsButton();
        testData.actionsOptionsToCheck.forEach((option) => {
          InstanceRecordView.validateOptionInActionsMenu(option, true, false);
        });

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.verifyRowShownAsSelected(callNumbers[1]);
      },
    );
  });
});
