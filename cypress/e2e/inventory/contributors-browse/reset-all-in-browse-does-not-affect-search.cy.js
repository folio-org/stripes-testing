import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  INSTANCE_SOURCE_NAMES,
  INVENTORY_DEFAULT_SORT_OPTIONS,
  INVENTORY_COLUMN_HEADERS,
} from '../../../support/constants';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C398011_Instance_${randomPostfix}`;
    const contributorValue = `AT_C398011_Contributor_${randomPostfix}`;
    const sourceAccordionName = 'Source';
    const instancesData = [
      { source: INSTANCE_SOURCE_NAMES.FOLIO },
      { source: INSTANCE_SOURCE_NAMES.FOLIO, contributorValue },
      { source: INSTANCE_SOURCE_NAMES.MARC },
      { source: INSTANCE_SOURCE_NAMES.MARC },
    ];
    const instanceTitles = Array.from(
      { length: instancesData.length },
      (_, i) => `${instanceTitlePrefix}_${i}`,
    );
    const tags = {
      tag008: '008',
      tag245: '245',
      tag700: '700',
    };

    const createdInstanceIds = [];
    let user;
    let contributorNameTypeId;

    before('Creating user and test data', () => {
      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiInventoryMoveItems.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          InventoryInstances.deleteInstanceByTitleViaApi('AT_C398011');

          cy.then(() => {
            BrowseContributors.getContributorNameTypes({
              searchParams: { limit: 1, query: 'name="Personal name"' },
            }).then((nameTypes) => {
              contributorNameTypeId = nameTypes[0].id;
            });
          })
            .then(() => {
              instancesData.forEach((instance, index) => {
                if (instance.source === INSTANCE_SOURCE_NAMES.FOLIO) {
                  const folioData = {
                    instanceTitle: instanceTitles[index],
                  };
                  if (instance.contributorValue) {
                    folioData.contributors = [
                      {
                        name: instance.contributorValue,
                        contributorNameTypeId,
                        contributorTypeText: '',
                        primary: false,
                      },
                    ];
                  }
                  InventoryInstance.createInstanceViaApi(folioData).then(({ instanceData }) => {
                    createdInstanceIds.push(instanceData.instanceId);
                  });
                } else {
                  cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
                    {
                      tag: tags.tag008,
                      content: QuickMarcEditor.defaultValid008Values,
                    },
                    {
                      tag: tags.tag245,
                      content: `$a ${instanceTitles[index]}`,
                      indicators: ['1', '1'],
                    },
                  ]).then((instanceId) => {
                    createdInstanceIds.push(instanceId);
                  });
                }
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              InventorySearchAndFilter.instanceTabIsDefault();
            });
        },
      );
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
    });

    it(
      'C398011 Verify that "Reset all" button clicked at "Browse inventory" pane does not affect the "Inventory" pane. (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C398011'] },
      () => {
        InventorySearchAndFilter.executeSearch(instanceTitlePrefix);
        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.verifyNumberOfSearchResults(instancesData.length);

        InventoryInstances.clickColumnHeader(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE, false);
        InventoryInstances.checkResultListSortedByColumn(1, false);

        InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
        InventorySearchAndFilter.selectOptionInExpandedFilter(
          sourceAccordionName,
          INSTANCE_SOURCE_NAMES.FOLIO,
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(
          instancesData.filter((i) => i.source === INSTANCE_SOURCE_NAMES.FOLIO).length,
        );

        InventoryInstances.clickActionsButton();
        InventorySearchAndFilter.verifyShowColumnsCheckboxesChecked(
          INVENTORY_COLUMN_HEADERS.CONTRIBUTORS,
        );
        InventorySearchAndFilter.toggleShowColumnCheckbox(
          INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS,
          false,
        );

        InventorySearchAndFilter.validateSearchTableColumnsShown(
          [INVENTORY_COLUMN_HEADERS.CONTRIBUTORS],
          false,
        );

        InventoryInstances.clickSelectAllInstancesCheckbox();
        InventoryInstances.verifySelectAllInstancesCheckbox(true);
        InventoryInstances.verifyAllCheckboxesAreChecked(true);

        InventoryInstances.selectInstanceByTitle(instanceTitles[0]);
        InventoryInstance.waitLoading();

        InventorySearchAndFilter.selectBrowseContributors();
        BrowseContributors.browse(contributorValue);
        BrowseContributors.waitForContributorToAppear(contributorValue);
        InventorySearchAndFilter.verifyBrowseResultListExists();

        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.verifyBrowseResultListExists(false);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifyResultListExists();

        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE, false);
        InventoryInstances.checkResultListSortedByColumn(1, false);
        InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          sourceAccordionName,
          INSTANCE_SOURCE_NAMES.FOLIO,
          true,
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(
          instancesData.filter((i) => i.source === INSTANCE_SOURCE_NAMES.FOLIO).length,
        );
        InventorySearchAndFilter.validateSearchTableColumnsShown(
          [INVENTORY_COLUMN_HEADERS.CONTRIBUTORS],
          false,
        );
        InventorySearchAndFilter.verifyInstanceDetailsViewAbsent();
        InventoryInstances.verifySelectAllInstancesCheckbox(false);
        InventoryInstances.verifyAllCheckboxesAreChecked(false);
      },
    );
  });
});
