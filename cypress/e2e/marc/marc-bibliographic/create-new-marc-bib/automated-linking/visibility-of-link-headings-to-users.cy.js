import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tags: {
            tag100: '100',
            tag245: '245',
          },

          fieldContents: {
            tag100Content: 'Author, Person $0 id001',
            tag245Content: 'New title',
          },
        };

        let userData = {};

        before(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C422142 User without permission "quickMARC: Can Link/unlink authority records to bib records" can\'t see "Link headings" button when create "MARC bib" (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C422142'] },
          () => {
            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });

            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            MarcAuthority.addNewField(
              4,
              testData.tags.tag100,
              `$a ${testData.fieldContents.tag100Content}`,
            );
            QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
          },
        );
      });
    });
  });
});
