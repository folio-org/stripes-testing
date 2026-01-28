import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        headerText: 'Create a new shared MARC bib record',
        tags: {
          tag245: '245',
        },
        fieldContents: {
          tag245Content: 'C405547 Created Shared Instance',
        },
        contributor: 'Dante Alighieri 1265-1321',
      };

      const users = {};

      const newField = {
        rowIndex: 5,
        tag: '700',
        content: '$a Dante Alighieri $d 1265-1321 $e Poet, Writer, Philosopher',
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
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        ])
          .then((userProperties) => {
            users.userBProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, users.userBProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(users.userAProperties.username, users.userAProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userAProperties.userId);
        Users.deleteViaApi(users.userBProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceID[0]);
      });

      it(
        'C422123 Create new Shared MARC bib in Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C422123'] },
        () => {
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
          cy.waitForAuthRefresh(() => {
            cy.login(users.userBProperties.username, users.userBProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.searchByTitle(testData.fieldContents.tag245Content);
          InventoryInstances.selectInstance();
          InventoryInstance.verifySharedIcon();
          InventoryInstance.checkPresentedText(testData.fieldContents.tag245Content);
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.checkContributor(testData.contributor);

          InventoryInstance.viewSource();
          InventoryViewSource.contains(
            `\t${testData.tags.tag245}\t   \t$a ${testData.fieldContents.tag245Content}`,
          );
          InventoryViewSource.contains(
            `\t${newField.tag}\t2 0\t$a Dante Alighieri $d 1265-1321 $e Poet, Writer, Philosopher`,
          );
        },
      );
    });
  });
});
