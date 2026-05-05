import { including } from '@interactors/html';
import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const lccnNumber1 = `  ${randomFourDigitNumber()}${randomFourDigitNumber()} `;
        const lccnNumber2 = `${getRandomLetters(2)}  ${randomFourDigitNumber()}${randomFourDigitNumber()} `;
        const canceledLccnNumber2 = `${getRandomLetters(2)}  ${randomFourDigitNumber()}${randomFourDigitNumber()} `;
        const lccnNumber3 = `${getRandomLetters(2)} ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const lccnNumber4 = `${getRandomLetters(2)}${randomFourDigitNumber()}${randomFourDigitNumber()}`;

        const marcInstanceTitles = Array.from(
          { length: 5 },
          (_, i) => `AT_C514852_MarcBibInstance_${randomPostfix}_${i}`,
        );
        const lccnsForCreation = ['draft1234', lccnNumber1, lccnNumber2, lccnNumber3, lccnNumber4];
        const marcInstanceFields = marcInstanceTitles.map((title, index) => [
          {
            tag: '008',
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: '245',
            content: `$a ${title}`,
            indicators: ['1', '1'],
          },
          {
            tag: '010',
            content:
              index === 2
                ? `$a ${lccnNumber2} $z ${canceledLccnNumber2}`
                : `$a ${lccnsForCreation[index]}`,
            indicators: ['\\', '\\'],
          },
        ]);
        const testCases = [
          { name: 'without prefix', value: lccnNumber1 },
          { name: 'with prefix and internal spaces', value: lccnNumber2 },
          { name: 'with prefix and without internal spaces', value: lccnNumber4 },
          { name: 'with prefix and one internal space', value: lccnNumber3 },
        ];
        const errorText = including('Fail: 010 $a already exists.');
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C514852');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          ])
            .then((createdUser) => {
              user = createdUser;

              marcInstanceFields.forEach((fields) => {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, fields).then(
                  (instanceId) => {
                    createdInstanceIds.push(instanceId);
                  },
                );
              });

              cy.toggleLccnDuplicateCheck({ enable: true });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          createdInstanceIds.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514852 Derive MARC bib record with value in "010 $a" subfield which matches to other records "LCCN", "Canceled LCCN" fields when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514852'] },
          () => {
            // Step 0: User is on the detail view pane of "MARC bibliographic" record
            InventoryInstances.searchByTitle(marcInstanceTitles[0]);
            InventoryInstances.selectInstanceByTitle(marcInstanceTitles[0]);
            InventoryInstance.waitLoading();

            // Step 1: Click on the "Actions" button >> "Derive new MARC bibliographic record"
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            // Steps 2-5: Update "010 $a" value with lccn value and check error
            testCases.forEach((testCase) => {
              QuickMarcEditor.updateExistingField('010', `$a ${testCase.value}`);
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
              QuickMarcEditor.closeAllCallouts();
            });

            // Step 6: Update "010 $a" value with value with prefix and internal spaces which matches to "Canceled LCCN" of existing (saved) record
            QuickMarcEditor.updateExistingField('010', `$a ${canceledLccnNumber2}`);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
          },
        );
      });
    });
  });
});
