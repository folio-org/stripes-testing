import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    const testData = {
      title: `AT_C491305_MarcBibInstance_${getRandomPostfix()}`,
      userProperties: {},
      tag008: '008',
      tag100: '100',
      tag245: '245',
      searchQuery: 'C491305 test',
    };

    const marcInstanceFields = [
      {
        tag: testData.tag008,
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: testData.tag245,
        content: `$a ${testData.title}`,
        indicators: ['1', '1'],
      },
      {
        tag: testData.tag100,
        content: '$a C491305 field 100',
        indicators: ['\\', '\\'],
      },
    ];

    const user = {};
    let createdInstanceId;

    before('Creating user and test data', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ]).then((createdUserProperties) => {
        user.userProperties = createdUserProperties;
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            createdInstanceId = instanceId;

            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          },
        );
      });
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
    });

    it(
      'C491305 Meaningful error message appears when user without "MARC Authority: View MARC authority record" permission opens "Select MARC authority" plugin (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C491305'] },
      () => {
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorities.verifyBrowseTabIsOpened();
        InventoryInstance.verifyPermissionMessageInSelectAuthorityModal();

        MarcAuthorities.switchToSearch();
        MarcAuthorities.verifySearchTabIsOpened();
        MarcAuthorities.searchBeats(testData.searchQuery);
        InventoryInstance.verifyPermissionMessageInSelectAuthorityModal();
      },
    );
  });
});
