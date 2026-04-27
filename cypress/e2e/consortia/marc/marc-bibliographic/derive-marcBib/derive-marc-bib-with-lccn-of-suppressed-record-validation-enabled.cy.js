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
        const randomDigits = randomFourDigitNumber();
        const lccnNumber = `${getRandomLetters(2)}${randomDigits}${randomDigits}`;
        const folioInstanceTitle = `AT_C589509_FolioInstance_${randomPostfix}`;
        const marcInstanceTitle = `AT_C589509_MarcBibInstance_${randomPostfix}`;
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${marcInstanceTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a 123',
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const errorText = including('Fail: 010 $a already exists.');
        const createdInstanceIds = [];
        let instanceTypeId;
        let lccnTypeId;
        let user;

        before('Create test data', () => {
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C589509');

            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            ])
              .then((createdUser) => {
                user = createdUser;

                cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                  (instanceTypes) => {
                    instanceTypeId = instanceTypes[0].id;
                  },
                );
                // Get identifier type IDs for each identifier type
                InventoryInstances.getIdentifierTypes({ query: 'name==/string "LCCN"' }).then(
                  (identifier) => {
                    lccnTypeId = identifier.id;
                  },
                );
              })
              .then(() => {
                // Create instance with identifier type
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstanceTitle,
                    staffSuppress: false,
                    discoverySuppress: true,
                    deleted: false,
                    identifiers: [
                      {
                        value: lccnNumber,
                        identifierTypeId: lccnTypeId,
                      },
                    ],
                  },
                }).then((createdInstanceData) => {
                  createdInstanceIds.push(createdInstanceData.instanceId);
                });

                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcInstanceFields[0],
                ).then((instanceId) => {
                  createdInstanceIds.push(instanceId);
                });

                cy.toggleLccnDuplicateCheck({ enable: true });
              });
          }).then(() => {
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
          'C589509 Cannot derive MARC bib record with value in "010 $a" subfield which matches to "Suppressed from discovery" record "LCCN" field when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C589509'] },
          () => {
            // Step 0: User is on the detail view pane of "MARC bibliographic" record
            InventoryInstances.searchByTitle(marcInstanceTitle);
            InventoryInstances.selectInstanceByTitle(marcInstanceTitle);
            InventoryInstance.waitLoading();

            // Step 1: Click on the "Actions" button >> "Derive new MARC bibliographic record"
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 2: Fill in "010 $a" "LCCN" of existing record, which is marked as suppressed from discovery:
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumber}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
          },
        );
      });
    });
  });
});
