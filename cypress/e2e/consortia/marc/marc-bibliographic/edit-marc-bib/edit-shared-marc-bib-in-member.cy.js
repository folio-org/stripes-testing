import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import { getCurrentTimestamp } from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const permissions = [
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ];
        const testData = {
          sharedBibSourcePaheheaderText: 'Shared MARC bibliographic record',
          tag245: '245',
          title: 'AT_C624269 Instance Shared Central',
          tag245ContentCentral: '$a AT_C624269 Instance Shared Central update central',
          tag245ContentMember: '$a AT_C624269 Instance Shared Central update member',
        };

        const users = {};

        const marcFiles = [
          {
            marc: 'marcBibFileC624269.mrc',
            fileName: `AT_C624269_testMarcFile.${getCurrentTimestamp()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
        ];

        const createdRecordIDs = [];

        before('Create users, data', () => {
          cy.getAdminToken();
          InventoryInstances.deleteInstanceByTitleViaApi('AT_C624269');
          cy.createTempUser(permissions)
            .then((userProperties) => {
              users.userProperties = userProperties;
              cy.affiliateUserToTenant({
                tenantId: Affiliations.College,
                userId: users.userProperties.userId,
                permissions,
              });
            })
            .then(() => {
              cy.resetTenant();
              DataImport.uploadFilesViaApi(marcFiles).then((ids) => {
                createdRecordIDs.push(...ids.createdInstanceIDs);
              });
              cy.waitForAuthRefresh(() => {
                cy.login(users.userProperties.username, users.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });

        after('Delete users, data', () => {
          cy.getAdminToken();
          cy.withinTenant(Affiliations.Consortia, () => {
            Users.deleteViaApi(users.userProperties.userId);
            InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          });
        });

        it(
          'C624269 Edit Shared MARC bibliographic record from Member tenant by user with granted permissions via Permission set (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C624269'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkInstanceTitle(testData.title);
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245ContentCentral);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndClose();

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkInstanceTitle(testData.title);
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245ContentCentral);
            QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245ContentMember);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245ContentMember);
          },
        );
      });
    });
  });
});
