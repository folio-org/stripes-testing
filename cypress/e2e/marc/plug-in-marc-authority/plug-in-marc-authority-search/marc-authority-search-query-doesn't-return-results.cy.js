import { DevTeams, TestTypes, Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('vMARC -> plug-in MARC authority | Search', () => {
  const user = {};
  const searchValue = `name${getRandomPostfix()}`;
  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      user.userProperties = createdUserProperties;

      cy.login(user.userProperties.username, user.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.searchByTitle('Crossfire');
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.clickLinkIconInTagField(12);
      MarcAuthorities.switchToSearch();
    });
  });

  afterEach(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(user.userProperties.userId);
    });
  });

  it(
    "C359180 MARC Authority plug-in | Use search query that doesn't return results (spitfire) (TaaS)",
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.searchByParameter('Keyword', searchValue);
      MarcAuthorities.checkNoResultsMessage(
        `No results found for "${searchValue}". Please check your spelling and filters.`,
      );
      MarcAuthorities.verifySearchResultTabletIsAbsent();
      MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('0 results found');
    },
  );
});
