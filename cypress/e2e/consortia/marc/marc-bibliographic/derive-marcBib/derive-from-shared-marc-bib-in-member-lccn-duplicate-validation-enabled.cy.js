import { including } from '@interactors/html';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = randomFourDigitNumber();
        const lccnNumberOfSharedInstance = `${getRandomLetters(2)} ${randomDigits}${randomDigits}`;
        const canceledLccnNumberOfSharedInstance = `${getRandomLetters(2)} ${randomDigits}${randomDigits}`;
        const lccnNumberOfLocalInstance = `${getRandomLetters(2)} ${randomDigits}${randomDigits}`;
        const canceledLccnNumberOfLocalInstance = `${getRandomLetters(2)} ${randomDigits}${randomDigits}`;
        const sharedMarcInstanceTitle = `AT_C514879_SharedMarcBibInstance_${randomPostfix}`;
        const sharedMarcInstanceTitleToBeDerived = `AT_C514879_SharedMarcBibInstanceToBeDerived_${randomPostfix}`;
        const localMarcInstanceTitle = `AT_C514879_LocalMarcBibInstance_${randomPostfix}`;
        const derivedLocalMarcInstanceTitle = `AT_C514879_DerivedLocalMarcBibInstance_${randomPostfix}`;
        const errorText = including('Fail: 010 $a already exists.');
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '245',
              content: `$a ${sharedMarcInstanceTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfSharedInstance} $z ${canceledLccnNumberOfSharedInstance}`,
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
              content: `$a ${sharedMarcInstanceTitleToBeDerived}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a draft123',
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
              content: `$a ${localMarcInstanceTitle}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfLocalInstance} $z ${canceledLccnNumberOfLocalInstance}`,
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C514879');
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C514879');

          cy.resetTenant();
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields[0],
          ).then((instanceId) => {
            createdInstanceIds.push(instanceId);
          });

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields[1],
          ).then((instanceId) => {
            createdInstanceIds.push(instanceId);
          });

          cy.setTenant(Affiliations.College);
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields[2],
          ).then((instanceId) => {
            createdInstanceIds.push(instanceId);
          });

          cy.toggleLccnDuplicateCheck({ enable: true });
          // Create user in Member tenant
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          ])
            .then((createdUser) => {
              user = createdUser;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]);
            })
            .then(() => {
              // Login to Member tenant
              cy.setTenant(Affiliations.College);
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceByTitleViaApi(sharedMarcInstanceTitle);
          InventoryInstances.deleteInstanceByTitleViaApi(sharedMarcInstanceTitleToBeDerived);
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteInstanceByTitleViaApi(localMarcInstanceTitle);
          InventoryInstances.deleteInstanceByTitleViaApi(derivedLocalMarcInstanceTitle);
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514879 Cannot derive Local MARC bib record with value in "010 $a" subfield which matches to other Shared, Local record "LCCN", "Canceled LCCN" fields when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514879'] },
          () => {
            // Step 0: User is on the detail view pane of Shared MARC bibliographic record (which has "010" field; but not the imported record)
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(sharedMarcInstanceTitleToBeDerived);
            InventoryInstances.selectInstanceByTitle(sharedMarcInstanceTitleToBeDerived);
            InventoryInstance.waitLoading();

            // Step 1: Click on "Actions" - "+ New MARC bibliographic record" option
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            // Steps 2: Update "010 $a" value with which matches to "LCCN" of existing Shared record
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumberOfSharedInstance}`);
            QuickMarcEditor.checkContentByTag('010', `$a ${lccnNumberOfSharedInstance}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.verifyValidationCallout();
            QuickMarcEditor.closeAllCallouts();

            // Steps 3: Update "010 $a" value with which matches to "Canceled LCCN" of existing Shared record
            QuickMarcEditor.updateExistingField('010', `$a ${canceledLccnNumberOfSharedInstance}`);
            QuickMarcEditor.checkContentByTag('010', `$a ${canceledLccnNumberOfSharedInstance}`);
            QuickMarcEditor.updateExistingField('245', `$a ${derivedLocalMarcInstanceTitle} 1`);
            QuickMarcEditor.checkContentByTag('245', `$a ${derivedLocalMarcInstanceTitle} 1`);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();

            // Step 4: Open detail view pane of Shared MARC bibliographic record (which has "010" field; but not the imported record)
            InventorySearchAndFilter.resetAll();
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(sharedMarcInstanceTitleToBeDerived);
            InventoryInstances.selectInstanceByTitle(sharedMarcInstanceTitleToBeDerived);
            InventoryInstance.waitLoading();

            // Step 5: Click on the "Actions" button placed on the third pane >> Select "Derive new MARC bibliographic record" option
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 6: Update "010 $a" value with which matches to "LCCN" of existing Local record
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumberOfLocalInstance}`);
            QuickMarcEditor.checkContentByTag('010', `$a ${lccnNumberOfLocalInstance}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.verifyValidationCallout();
            QuickMarcEditor.closeAllCallouts();

            // Step 7: Update "010 $a" value with which matches to "Canceled LCCN" of existing Local record
            QuickMarcEditor.updateExistingField('010', `$a ${canceledLccnNumberOfLocalInstance}`);
            QuickMarcEditor.checkContentByTag('010', `$a ${canceledLccnNumberOfLocalInstance}`);
            QuickMarcEditor.updateExistingField('245', `$a ${derivedLocalMarcInstanceTitle} 2`);
            QuickMarcEditor.checkContentByTag('245', `$a ${derivedLocalMarcInstanceTitle} 2`);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
          },
        );
      });
    });
  });
});
