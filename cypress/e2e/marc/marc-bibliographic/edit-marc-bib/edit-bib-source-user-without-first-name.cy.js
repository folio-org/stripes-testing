import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag245: '245',
      };
      const instanceTitle = `AT_C356849_MarcBibInstance_${randomPostfix}`;
      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a ${instanceTitle}`,
          indicators: ['1', '1'],
        },
      ];
      const updatedInstanceTitle = `${instanceTitle}_Updated`;

      let adminSourceRecord;
      let user;
      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((createdUserProperties) => {
            user = createdUserProperties;
          })
          .then(() => {
            cy.getAdminSourceRecord().then((record) => {
              adminSourceRecord = record;
            });
            cy.getUsers({ limit: 1, query: `username=${user.username}` }).then((users) => {
              cy.updateUser({
                ...users[0],
                personal: { ...users[0].personal, firstName: null },
              });
            });
          })
          .then(() => {
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdInstanceId = instanceId;
              },
            );
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
      });

      it(
        'C356849 Verify that "Source" value displays only the Last name of user, which edited record, when First name of user is not populated (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C356849'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkUserNameInHeader(null, adminSourceRecord);

          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${updatedInstanceTitle}`);
          QuickMarcEditor.checkContentByTag(testData.tag245, `$a ${updatedInstanceTitle}`);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(updatedInstanceTitle);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkUserNameInHeader(null, user.lastName);
        },
      );
    });
  });
});
