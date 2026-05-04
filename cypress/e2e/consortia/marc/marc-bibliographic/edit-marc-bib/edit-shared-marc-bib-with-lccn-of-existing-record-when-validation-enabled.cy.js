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
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const lccnNumberOfSharedInstance = `${getRandomLetters(2)} ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const canceledLccnNumberOfSharedInstance = `${getRandomLetters(2)} ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const lccnNumberOfLocalInstance = `${getRandomLetters(2)} ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const canceledLccnNumberOfLocalInstance = `${getRandomLetters(2)} ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const sharedMarcInstanceTitle = `AT_C514878_SharedMarcBibInstance_${randomPostfix}`;
        const sharedMarcInstanceTitleToBeEdited = `AT_C514878_SharedMarcBibInstanceToBeEdited_${randomPostfix}`;
        const localMarcInstanceTitle = `AT_C514878_LocalMarcBibInstance_${randomPostfix}`;
        const marcInstanceFields = [
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfSharedInstance} $z ${canceledLccnNumberOfSharedInstance}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: '245',
              content: `$a ${sharedMarcInstanceTitle}`,
              indicators: ['1', '1'],
            },
          ],
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '010',
              content: '$a draft123',
              indicators: ['\\', '\\'],
            },
            {
              tag: '245',
              content: `$a ${sharedMarcInstanceTitleToBeEdited}`,
              indicators: ['1', '1'],
            },
          ],
          [
            {
              tag: '008',
              content: QuickMarcEditor.defaultValid008Values,
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfLocalInstance} $z ${canceledLccnNumberOfLocalInstance}`,
              indicators: ['\\', '\\'],
            },
            {
              tag: '245',
              content: `$a ${localMarcInstanceTitle}`,
              indicators: ['1', '1'],
            },
          ],
        ];
        const errorText = including('Fail: 010 $a already exists.');
        const createdInstanceIds = [];
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C514878');
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C514878');

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
          ])
            .then((createdUser) => {
              user = createdUser;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.inventoryAll.gui,
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
          createdInstanceIds.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
          cy.setTenant(Affiliations.College);
          createdInstanceIds.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514878 Cannot save existing Shared MARC bib record with value in "010 $a" subfield which matches to other Shared, Local records "LCCN" field when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514878'] },
          () => {
            // Step 0: User is on the detail view pane of Shared "MARC bibliographic" record
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(sharedMarcInstanceTitleToBeEdited);
            InventoryInstances.selectInstanceByTitle(sharedMarcInstanceTitleToBeEdited);
            InventoryInstance.waitLoading();

            // Step 1: Click "Actions" button in the third pane → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 2: Update "010 $a" value with which matches to "LCCN" of existing Shared record
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumberOfSharedInstance}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 3: Update "010 $a" value with which matches to "Canceled LCCN" of existing Shared record
            QuickMarcEditor.updateExistingField('010', `$a ${canceledLccnNumberOfSharedInstance}`);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.checkErrorMessage(4, errorText, false);

            // Step 4: Update "010 $a" value with which matches to "LCCN" of existing Local record
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumberOfLocalInstance}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 5: Update "010 $a" value with which matches to "Canceled LCCN" of existing Local record
            QuickMarcEditor.updateExistingField('010', `$a ${canceledLccnNumberOfLocalInstance}`);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.checkErrorMessage(4, errorText, false);
          },
        );
      });
    });
  });
});
