import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tag004: '004',
      tag008: '008',
      tag852: '852',
      tag866: '866',
      marcBibTitle: `AT_C356850_MarcBibInstance_${getRandomPostfix()}`,
      tag866Value: 'Field866',
      tag866UpdatedValue: 'Field866 - Updated',
      userBody: {
        type: 'staff',
        active: true,
        username: `at_c356850_username_${getRandomPostfix()}`,
        personal: {
          lastName: `AT_C356850_LastName_${getRandomPostfix()}`,
          email: 'AT_C356850@test.com',
          preferredContactTypeId: '002',
        },
      },
      userPassword: 'MyComplicatedPassword123!',
    };

    let recordId;

    before('Creating user, data', () => {
      cy.getAdminToken();
      cy.getAdminSourceRecord().then((record) => {
        testData.adminSourceRecord = record;
      });

      cy.then(() => {
        cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
          (location) => {
            // create MARC instance with Holding and without Items
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
              recordId = instanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.createMarcHoldingsViaAPI(instanceData.id, [
                  {
                    content: instanceData.hrid,
                    tag: testData.tag004,
                  },
                  {
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                    tag: testData.tag008,
                  },
                  {
                    content: `$b ${location.code}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag852,
                  },
                  {
                    content: `$a ${testData.tag866Value}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag866,
                  },
                ]);
              });
            });
          },
        );
      })
        .then(() => {
          cy.getAdminToken();
          Users.createViaApi(testData.userBody).then((user) => {
            testData.userId = user.id;

            cy.setUserPassword({
              username: testData.userBody.username,
              userId: testData.userId,
              password: testData.userPassword,
            }).then(() => {
              cy.assignPermissionsToExistingUser(testData.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
              ]);
            });
          });
        })
        .then(() => {
          cy.login(testData.userBody.username, testData.userPassword, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
    });

    it(
      'C356850 Verify that "Source" value displays only the Last name of user, which edited record, when First name of user is not populated (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C356850'] },
      () => {
        InventoryInstances.searchByTitle(recordId);
        InventoryInstances.selectInstanceById(recordId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkUserNameInHeader(null, testData.adminSourceRecord);

        QuickMarcEditor.updateExistingField(testData.tag866, `$a ${testData.tag866UpdatedValue}`);
        QuickMarcEditor.checkContentByTag(testData.tag866, `$a ${testData.tag866UpdatedValue}`);

        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();
        HoldingsRecordView.waitLoading();

        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkUserNameInHeader(null, testData.userBody.personal.lastName);
      },
    );
  });
});
