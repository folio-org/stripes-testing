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

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C411505_Instance_${randomPostfix}`,
      subjectPrefix: `AT_C411505_Subject_${randomPostfix}`,
    };
    const instanceTitles = [
      `${testData.instanceTitlePrefix} A`,
      `${testData.instanceTitlePrefix} B`,
    ];
    const subjects = [
      `${testData.subjectPrefix} Marc Subject`,
      `${testData.subjectPrefix} Folio Subject`,
      `${testData.subjectPrefix} Both Subject`,
    ];
    const marcInstanceFields = [
      {
        tag: '008',
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: '245',
        content: `$a ${instanceTitles[0]}`,
        indicators: ['1', '1'],
      },
      {
        tag: '600',
        content: `$a ${subjects[0]}`,
        indicators: ['\\', '\\'],
      },
      {
        tag: '610',
        content: `$a ${subjects[2]}`,
        indicators: ['\\', '\\'],
      },
    ];
    const instanceIds = [];
    let locationId;
    let holdingsSourceId;
    let subjectTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411505');

      cy.then(() => {
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          locationId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          holdingsSourceId = folioSource.id;
        });
        cy.getSubjectTypesViaApi({
          limit: 1,
          query: '(source="folio" and name="Corporate name")',
        }).then((res) => {
          subjectTypeId = res[0].id;
        });
      })
        .then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: instanceTitles[1],
                subjects: [{ value: subjects[1] }, { value: subjects[2], typeId: subjectTypeId }],
              },
            }).then((instanceData) => {
              instanceIds.push(instanceData.instanceId);
            });
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((instanceId) => {
              instanceIds.push(instanceId);
            });
          });
        })
        .then(() => {
          instanceIds.forEach((id) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: id,
              permanentLocationId: locationId,
              sourceId: holdingsSourceId,
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
      'C411505 Browse (subjects): Show instance result in third pane when Number of titles = 1 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C411505'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        BrowseSubjects.select();
        subjects.forEach((subject) => {
          BrowseSubjects.waitForSubjectToAppear(subject);
        });
        BrowseSubjects.browse(subjects[0].slice(0, -8));
        BrowseSubjects.selectRecordByTitle(subjects[0]);

        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
        InventoryInstance.verifyInstanceTitle(instanceTitles[0]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.moveItemsWithinAnInstance,
        );
        InstanceRecordView.clickActionsButton();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.moveHoldingsItemsToAnotherInstance,
        );

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.verifyRowShownAsSelected(subjects[0]);

        BrowseSubjects.browse(subjects[1].slice(0, -8));
        BrowseSubjects.selectRecordByTitle(subjects[1]);

        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
        InventoryInstance.verifyInstanceTitle(instanceTitles[1]);
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.FOLIO);
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.moveItemsWithinAnInstance,
        );
        InstanceRecordView.clickActionsButton();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.moveHoldingsItemsToAnotherInstance,
        );

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.verifyRowShownAsSelected(subjects[1]);

        BrowseSubjects.browse(subjects[2].slice(0, -8));
        BrowseSubjects.selectRecordByTitle(subjects[2]);

        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.checkRowsCount(2);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
      },
    );
  });
});
