import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Automated linking', () => {
  const testData = {
    tags: {
      tag100: '100',
      tag245: '245',
      tagLDR: 'LDR',
    },

    fieldContents: {
      tag100Content: 'Author, Person $0 id001',
      tag245Content: 'New title',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
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
    'C380703 User without permission "quickMARC: Can Link/unlink authority records to bib records" can\'t see "Link headings" button when create "MARC bib" (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
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
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      MarcAuthority.addNewField(
        4,
        testData.tags.tag100,
        `$a ${testData.fieldContents.tag100Content}`,
      );
      QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
    },
  );
});
