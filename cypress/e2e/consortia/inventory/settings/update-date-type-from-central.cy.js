import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Date type', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const testData = {
          totalAmountOfDateTypes: 15,
          dateTypeSource: 'folio',
          keyToUpdate: 'name',
          newName: `Fortlaufende Ressource - Update zur Einstellung der Veröffentlichung ${randomPostfix}`,
          instanceTitle: `C506704 Bib Shared ${randomPostfix}`,
          instanceTitleLocal: `C506704 Bib Local ${randomPostfix}`,
          date1: '1984',
          date2: '1992',
        };
        let user;
        let originalDateType;
        let instanceId;
        let instanceIdLocal;

        before('Create user, authorize', () => {
          cy.getAdminToken();
          cy.getInstanceDateTypesViaAPI().then((response) => {
            originalDateType = response.instanceDateTypes[response.instanceDateTypes.length - 3];
          });
          cy.createTempUser([
            Permissions.getInstanceDateTypes.gui,
            Permissions.patchInstanceDateTypes.gui,
            Permissions.uiInventoryViewCreateEditInstances.gui,
          ])
            .then((userProperties) => {
              user = userProperties;
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.getInstanceDateTypes.gui,
                Permissions.patchInstanceDateTypes.gui,
                Permissions.uiInventoryViewCreateEditInstances.gui,
              ]);
              cy.resetTenant();
              cy.getToken(user.username, user.password, false);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.patchInstanceDateTypeViaAPI(
            originalDateType.id,
            testData.keyToUpdate,
            originalDateType.name,
            true,
          );
          InventoryInstance.deleteInstanceViaApi(instanceId);
          Users.deleteViaApi(user.userId);
          cy.setTenant(Affiliations.College);
          InventoryInstance.deleteInstanceViaApi(instanceIdLocal);
        });

        it(
          'C506701 Update of Date type\'s "name" on Central tenant and check that from Member tenant user sees the same Date types (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C506701'] },
          () => {
            cy.patchInstanceDateTypeViaAPI(
              originalDateType.id,
              testData.keyToUpdate,
              testData.newName,
              true,
            ).then(({ status }) => {
              expect(status).to.eq(204);

              cy.getInstanceDateTypesViaAPI().then((responseMember) => {
                expect(responseMember.status).to.eq(200);
                expect(responseMember.instanceDateTypes).to.have.lengthOf(
                  testData.totalAmountOfDateTypes,
                );
                expect(
                  responseMember.instanceDateTypes.every(
                    (type) => type.source === testData.dateTypeSource,
                  ),
                ).to.eq(true);
                const matchedDateTypeMember = responseMember.instanceDateTypes.filter(
                  (type) => type.id === originalDateType.id,
                )[0];
                expect(matchedDateTypeMember.name).to.eq(testData.newName);

                cy.waitForAuthRefresh(() => {
                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
                }, 20_000);
                InventoryInstances.waitContentLoading();
                InventoryInstances.addNewInventory();
                InventoryNewInstance.fillRequiredValues(testData.instanceTitle);
                InstanceRecordEdit.verifyDateFieldsPresent();
                InstanceRecordEdit.fillDates(testData.date1, testData.date2, testData.newName);
                InventoryNewInstance.clickSaveCloseButton();
                InventoryInstances.searchByTitle(testData.instanceTitle);
                InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
                InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
                InventoryInstance.getId().then((id) => {
                  instanceId = id;
                });
                InstanceRecordView.verifyDates(testData.date1, testData.date2, testData.newName);

                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
                InventoryInstances.waitContentLoading();
                InventoryInstances.searchByTitle(testData.instanceTitle);
                InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
                InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitle);
                InstanceRecordView.verifyDates(testData.date1, testData.date2, testData.newName);
                InstanceRecordView.edit();
                InstanceRecordEdit.waitLoading();
                InstanceRecordEdit.verifyDateFieldsValues(
                  testData.date1,
                  testData.date2,
                  testData.newName,
                );
                InstanceRecordEdit.close();

                InventoryInstances.addNewInventory();
                InventoryNewInstance.fillRequiredValues(testData.instanceTitleLocal);
                InstanceRecordEdit.verifyDateFieldsPresent();
                InstanceRecordEdit.fillDates(testData.date1, testData.date2, testData.newName);
                InventoryNewInstance.clickSaveCloseButton();
                InventoryInstances.searchByTitle(testData.instanceTitleLocal);
                InventoryInstances.selectInstanceByTitle(testData.instanceTitleLocal);
                InstanceRecordView.verifyInstanceIsOpened(testData.instanceTitleLocal);
                InventoryInstance.getId().then((id) => {
                  instanceIdLocal = id;
                });
                InstanceRecordView.verifyDates(testData.date1, testData.date2, testData.newName);
              });
            });
          },
        );
      });
    });
  });
});
