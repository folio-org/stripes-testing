import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        headerText: 'Create a new local MARC bib record',
        tags: {
          tag245: '245',
        },
        fieldContents: {
          tag245Content: 'C405548 Created Local Instance',
        },
        contributor: 'Publius Vergilius Maro',
      };

      const users = {};

      const newField = {
        rowIndex: 5,
        tag: '700',
        content: '$a Publius Vergilius Maro $d 70-19 BC $e Poet',
      };

      const createdInstanceID = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((userProperties) => {
          users.userAProperties = userProperties;
        });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ])
          .then((userProperties) => {
            users.userBProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, users.userBProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            ]);
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userAProperties.userId);
        Users.deleteViaApi(users.userBProperties.userId);
      });

      it(
        'C422124 Create new Local MARC bib in Member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C422124'] },
        () => {
          cy.resetTenant();
          cy.waitForAuthRefresh(() => {
            cy.login(users.userBProperties.username, users.userBProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstance.newMarcBibRecord();
          // Verify pane header label
          QuickMarcEditor.checkPaneheaderContains(testData.headerText);
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            `$a ${testData.fieldContents.tag245Content}`,
          );
          QuickMarcEditor.updateLDR06And07Positions();
          MarcAuthority.addNewField(4, newField.tag, newField.content);
          QuickMarcEditor.updateIndicatorValue(newField.tag, '2', 0);
          QuickMarcEditor.updateIndicatorValue(newField.tag, '0', 1);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.getId().then((id) => {
            createdInstanceID.push(id);
          });
          InventoryInstance.checkPresentedText(testData.fieldContents.tag245Content);
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.checkContributor(testData.contributor);
          InventoryInstance.viewSource();
          InventoryViewSource.contains(
            `\t${testData.tags.tag245}\t   \t$a ${testData.fieldContents.tag245Content}`,
          );
          InventoryViewSource.contains(
            `\t${newField.tag}\t2 0\t$a Publius Vergilius Maro $d 70-19 BC $e Poet`,
          );

          cy.resetTenant();
          cy.waitForAuthRefresh(() => {
            cy.login(users.userAProperties.username, users.userAProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
          InventoryInstances.searchByTitle(testData.fieldContents.tag245Content, false);
          InventoryInstance.verifyNoResultFoundMessage(
            `No results found for "${testData.fieldContents.tag245Content}". Please check your spelling and filters.`,
          );
        },
      );
    });
  });
});
