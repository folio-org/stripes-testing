import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const lccnPostfix = `476805${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const testData = {
        advSearchOption: 'Advanced search',
        instanceTitlePrefix: `AT_C476805_MarcBibInstance_${randomPostfix}`,
        tag008: '008',
        tag010: '010',
        tag245: '245',
        lccnNumbers: [
          `2017052862${lccnPostfix}`,
          `n  97021259${lccnPostfix}`,
          `n  12397021259${lccnPostfix}`,
          `n  970212591${lccnPostfix}`,
          `sh  3129702125916${lccnPostfix}`,
        ],
        canceledLccnNumbers: [`n  2015061084${lccnPostfix}`, `n79066095${lccnPostfix}`],
      };

      const searchData = [
        { fieldContent: '$a', expectedResultIndexes: [] },
        { fieldContent: `$a ${testData.lccnNumbers[0]}`, expectedResultIndexes: [1] },
        {
          fieldContent: `$a ${testData.lccnNumbers[0]} $z ${testData.canceledLccnNumbers[0]}`,
          expectedResultIndexes: [1, testData.lccnNumbers.length + 1],
        },
        {
          fieldContent: `$a ${testData.lccnNumbers[0]} $a ${testData.lccnNumbers[1]} $a ${testData.lccnNumbers[2]} $z ${testData.canceledLccnNumbers[0]} $z ${testData.canceledLccnNumbers[1]}`,
          expectedResultIndexes: [
            1,
            2,
            3,
            testData.lccnNumbers.length + 1,
            testData.lccnNumbers.length + 2,
          ],
        },
        {
          fieldContent: `$a ${testData.lccnNumbers[0]} $a ${testData.lccnNumbers[1]} $a ${testData.lccnNumbers[2]} $a ${testData.lccnNumbers[3]} $z ${testData.canceledLccnNumbers[0]} $z ${testData.canceledLccnNumbers[1]}`,
          expectedResultIndexes: [
            1,
            2,
            3,
            4,
            testData.lccnNumbers.length + 1,
            testData.lccnNumbers.length + 2,
          ],
        },
        {
          fieldContent: `$a ${testData.lccnNumbers[0]} $a ${testData.lccnNumbers[1]} $a ${testData.lccnNumbers[2]} $a ${testData.lccnNumbers[3]} $a ${testData.lccnNumbers[4]} $z ${testData.canceledLccnNumbers[0]} $z ${testData.canceledLccnNumbers[1]}`,
          expectedResultIndexes: [1, 2, 3, 4, 5, testData.lccnNumbers.length + 1],
        },
      ];

      const createdInstanceIds = [];

      before(() => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C476805_MarcBibInstance');
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            testData.lccnNumbers.forEach((lccn, index) => {
              const marcInstanceFields = [
                {
                  tag: testData.tag008,
                  content: QuickMarcEditor.defaultValid008Values,
                },
                {
                  tag: testData.tag245,
                  content: `$a ${testData.instanceTitlePrefix} ${index + 1}`,
                  indicators: ['1', '1'],
                },
                {
                  tag: testData.tag010,
                  content: `$a ${lccn}`,
                  indicators: ['\\', '\\'],
                },
              ];
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                createdInstanceIds.push(instanceId);
              });
            });

            testData.canceledLccnNumbers.forEach((lccn, index) => {
              const marcInstanceFields = [
                {
                  tag: '008',
                  content: QuickMarcEditor.defaultValid008Values,
                },
                {
                  tag: '245',
                  content: `$a ${testData.instanceTitlePrefix} ${index + testData.lccnNumbers.length + 1}`,
                  indicators: ['1', '1'],
                },
                {
                  tag: '010',
                  content: `$z ${lccn}`,
                  indicators: ['\\', '\\'],
                },
              ];
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                createdInstanceIds.push(instanceId);
              });
            });
          }).then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C476805 Run search for "Instance" records by "010" field values from "Create a new MARC bib record" window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476805'] },
        () => {
          function goToCreateBib(field010Content) {
            InventoryInstances.waitContentLoading();
            InventoryInstance.newMarcBibRecord();
            MarcAuthority.addNewField(4, testData.tag010, field010Content);
          }

          searchData.forEach((search, index) => {
            goToCreateBib(search.fieldContent);
            QuickMarcEditor.checkSearchButtonShownIn010Field({ checkHoverText: true });
            QuickMarcEditor.clickSearchButtonIn010Field();
            if (!index) {
              InventorySearchAndFilter.verifySearchOptionAndQuery(testData.advSearchOption, '');
              InventorySearchAndFilter.verifyResultPaneEmpty();
            } else {
              InventorySearchAndFilter.verifySearchOptionAndQuery(
                testData.advSearchOption,
                'lccn exactPhrase',
              );
              search.expectedResultIndexes.forEach((recordIndex) => {
                InventorySearchAndFilter.verifySearchResult(
                  `${testData.instanceTitlePrefix} ${recordIndex}`,
                );
              });
            }
            if (index > 2) {
              InventoryInstances.clickAdvSearchButton();
              const lccnNumbers = search.fieldContent
                .match(/\$[az]\s+([^$]*)/g)
                .map((match) => match.replace(/\$[az]\s+/, '').trim());
              for (let i = 0; i < search.expectedResultIndexes.length; i++) {
                InventoryInstances.checkAdvSearchModalValues(
                  i,
                  lccnNumbers[i],
                  'Exact phrase',
                  'LCCN, normalized',
                );
              }
              InventoryInstances.closeAdvancedSearchModal();
            }
            if (index) InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
        },
      );
    });
  });
});
