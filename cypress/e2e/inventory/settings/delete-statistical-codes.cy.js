import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import StatisticalCodes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Statistical codes', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitle = `AT_C703328_FolioInstance_${randomPostfix}`;
      const statisticalCodeNamePrefix = `AT_C703328_StatisticalCode_${randomPostfix}`;
      const statisticalCodePrefix = `AT_C703328_SCode_${randomPostfix}`;
      const statisticalCodes = Array.from({ length: 4 }, (_, i) => {
        return {
          code: `${statisticalCodePrefix} ${i + 1}`,
          name: `${statisticalCodeNamePrefix} ${i + 1}`,
        };
      });

      let user;
      let locationId;
      let materialTypeId;
      let loanTypeId;
      let holdingTypeId;
      let instanceTypeId;
      let instanceId;
      let statisticalCodeTypeId;
      const statisticalCodesIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C703328');

        cy.then(() => {
          cy.getStatisticalCodeTypes({ limit: 1, query: 'source="folio"' }).then((codeTypes) => {
            statisticalCodeTypeId = codeTypes[0].id;
            statisticalCodes.forEach((code) => {
              StatisticalCodes.createViaApi({
                source: 'local',
                code: code.code,
                name: code.name,
                statisticalCodeTypeId,
              }).then((response) => {
                statisticalCodesIds.push(response.id);
              });
            });
          });
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            holdingTypeId = res[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
          }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialTypeId = res.id;
          });
        })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instanceTitle,
                statisticalCodeIds: [statisticalCodesIds[0]],
              },
              holdings: [
                {
                  holdingsTypeId: holdingTypeId,
                  permanentLocationId: locationId,
                  statisticalCodeIds: [statisticalCodesIds[1]],
                },
              ],
            }).then((instanceData) => {
              instanceId = instanceData.instanceId;

              ItemRecordNew.createViaApi({
                holdingsId: instanceData.holdingIds[0].id,
                materialTypeId,
                permanentLoanTypeId: loanTypeId,
                statisticalCodeIds: [statisticalCodesIds[2]],
              });
            });
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
              Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        Users.deleteViaApi(user.userId);
        statisticalCodesIds.forEach((id) => {
          StatisticalCodes.deleteViaApi(id);
        });
      });

      it(
        'C703328 Delete "Statistical codes" assigned/not assigned to the Instance/Holdings/Item (spitfire)',
        {
          tags: ['extendedPath', 'spitfire', 'C703328'],
        },
        () => {
          cy.login(user.username, user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
          StatisticalCodes.waitLoading();

          for (let i = 0; i < 3; i++) {
            StatisticalCodes.clickActionIconForStatisticalCode(
              statisticalCodes[i].code,
              statisticalCodes[i].name,
              StatisticalCodes.ACTIONS.DELETE,
            );
            StatisticalCodes.confirmDeleteStatisticalCode();
            StatisticalCodes.verifyDeleteErrorModal();
            StatisticalCodes.dismissDeleteErrorModal();
            StatisticalCodes.verifyStatisticalCodeShown(
              statisticalCodes[i].code,
              statisticalCodes[i].name,
            );
          }

          StatisticalCodes.clickActionIconForStatisticalCode(
            statisticalCodes[3].code,
            statisticalCodes[3].name,
            StatisticalCodes.ACTIONS.DELETE,
          );
          StatisticalCodes.confirmDeleteStatisticalCode();
          StatisticalCodes.checkDeleteNotification(statisticalCodes[3].code);
          StatisticalCodes.verifyStatisticalCodeShown(
            statisticalCodes[3].code,
            statisticalCodes[3].name,
            false,
          );
        },
      );
    });
  });
});
