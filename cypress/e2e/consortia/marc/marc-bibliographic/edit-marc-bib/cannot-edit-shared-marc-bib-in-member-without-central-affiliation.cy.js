import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const userAPermissionsMember = [
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ];
        const userBPermissionsCentral = [Permissions.inventoryAll.gui];
        const userBPermissionsMember = [
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ];
        const testData = {
          tag008: '008',
          tag245: '245',
          marcInstanceTitle: `AT_C405506_MarcBibInstance_${randomPostfix}`,
        };

        const marcInstanceFields = [
          {
            tag: testData.tag008,
            content: QuickMarcEditor.defaultValid008Values,
          },
          {
            tag: testData.tag245,
            content: `$a ${testData.marcInstanceTitle}`,
            indicators: ['1', '1'],
          },
        ];

        let userA;
        let userB;
        let createdInstanceId;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser(userBPermissionsCentral)
            .then((userBProperties) => {
              userB = userBProperties;
              cy.affiliateUserToTenant({
                tenantId: Affiliations.College,
                userId: userB.userId,
                permissions: userBPermissionsMember,
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser(userAPermissionsMember).then((userAProperties) => {
                userA = userAProperties;
                cy.resetTenant();

                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcInstanceFields,
                ).then((instanceId) => {
                  createdInstanceId = instanceId;

                  cy.setTenant(Affiliations.College);
                  cy.waitForAuthRefresh(() => {
                    cy.login(userA.username, userA.password, {
                      path: TopMenu.inventoryPath,
                      waiter: InventoryInstances.waitContentLoading,
                    });
                  }, 20_000);
                });
              });
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userB.userId);
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userA.userId);
        });

        it(
          'C405506 User without affiliation or edit permissions in Central tenant cannot edit shared "MARC Bib" in member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C405506'] },
          () => {
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InstanceRecordView.verifyWarningMessage();

            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(userB.username, userB.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();

            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.checkInstanceTitle(testData.marcInstanceTitle);
            InventoryInstance.verifyEditButtonsShown({ folioEdit: true, marcEdit: false });
          },
        );
      });
    });
  });
});
