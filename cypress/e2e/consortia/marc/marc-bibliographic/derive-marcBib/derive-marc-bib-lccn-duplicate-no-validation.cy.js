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
        const randomDigits = randomFourDigitNumber();
        const lccnNumber = `${getRandomLetters(15)}${randomDigits}${randomDigits}`;
        const marcInstanceTitle = `AT_C523572_MarcBibInstance_${randomPostfix}`;
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${marcInstanceTitle} Test`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a 123',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${marcInstanceTitle} 1`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumber}`,
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${marcInstanceTitle} 2`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$z ${lccnNumber}`,
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C523572');
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            ]).then((createdUser) => {
              user = createdUser;

              marcInstanceFields.forEach((fields) => {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, fields).then(
                  (instanceId) => {
                    createdInstanceIds.push(instanceId);
                  },
                );
              });

              // Default setting. Setting up just in case someone changed it:
              cy.toggleLccnDuplicateCheck({ enable: false });
            });
          }).then(() => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceByTitleViaApi(marcInstanceTitle);
        });

        it(
          'C523572 Derive MARC bib record with value in "010 $a" subfield which matches to other records "LCCN", "Canceled LCCN" fields when duplicate LCCN check is disabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C523572'] },
          () => {
            InventoryInstances.searchByTitle(`${marcInstanceTitle} Test`);
            InventoryInstances.selectInstanceByTitle(`${marcInstanceTitle} Test`);
            InventoryInstance.waitLoading();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.updateLDR06And07Positions();

            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumber}`);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
          },
        );
      });
    });
  });
});
