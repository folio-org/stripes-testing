import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

const capabSetsToAssign = [
  CapabilitySets.uiInventoryInstanceView,
  CapabilitySets.uiQuickMarcQuickMarcEditorView,
  CapabilitySets.uiQuickMarcQuickMarcEditor,
];

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        sharedInstanceTitle: `AT_C1385651_SharedMarcBibInstance_${randomPostfix}`,
        localInstanceTitle: `AT_C1385651_LocalMarcBibInstance_${randomPostfix}`,
        updatedSharedNoteContent: '$a Updated shared local note content',
        updatedLocalNoteContent: '$a Updated local note content',
        user: {},
      };

      const sharedMarcBibFields = [
        { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
        {
          tag: '245',
          content: `$a ${testData.sharedInstanceTitle}`,
          indicators: ['1', '1'],
        },
        {
          tag: '591',
          content: '$a Original shared local note content',
          indicators: ['\\', '\\'],
        },
      ];
      const localMarcBibFields = [
        { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
        {
          tag: '245',
          content: `$a ${testData.localInstanceTitle}`,
          indicators: ['1', '1'],
        },
        {
          tag: '591',
          content: '$a Original local note content',
          indicators: ['\\', '\\'],
        },
      ];

      before('Enable feature, create test data and user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        // "Prevent redundant updates" is disabled by default, and its setting update is only
        // available via the Central tenant for ECS - member tenants get it propagated
        // automatically
        cy.setInventoryOptimizeUpdatesSetting(true);

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, sharedMarcBibFields).then(
          (instanceId) => {
            testData.sharedInstanceId = instanceId;
          },
        );

        cy.setTenant(Affiliations.College);
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, localMarcBibFields).then(
          (instanceId) => {
            testData.localInstanceId = instanceId;
          },
        );

        // User created in College (member) so it logs in there directly (ECS skill Pattern 1)
        cy.createTempUser([]).then((createdUser) => {
          testData.user = createdUser;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);

          // Same capability sets also assigned in Central (Central affiliation is automatic)
          cy.resetTenant();
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);

          cy.setTenant(Affiliations.College);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Restore feature setting and delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        cy.setInventoryOptimizeUpdatesSetting(false);
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId);

        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.localInstanceId);
      });

      it(
        'C1385651 Shared and local Instance metadata is not updated after editing a non-mapping MARC field in quickMARC when Prevent redundant updates in Inventory is enabled (consortia) (promin)',
        { tags: ['extendedPathECS', 'promin', 'nonParallel', 'C1385651'] },
        () => {
          // Step 1: switch active affiliation to Central tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          InventoryInstances.waitContentLoading();

          // Step 2-3: open the shared Instance, note Record last updated, edit the
          // non-mapping 591 field via quickMARC, save - Record last updated stays unchanged
          InventoryInstances.searchByTitle(testData.sharedInstanceId);
          InventoryInstances.selectInstanceById(testData.sharedInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InstanceRecordView.getLastUpdatedDateAndTime().then((sharedBaseline) => {
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.updateExistingField('591', testData.updatedSharedNoteContent);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InstanceRecordView.verifyLastUpdatedDateAndTime(sharedBaseline);

            // Step 4-5: switch back to College, reopen the same shared Instance - still
            // visible as shared, "Record last updated" still equals the Central baseline
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(testData.sharedInstanceId);
            InventoryInstances.selectInstanceById(testData.sharedInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.checkSharedTextInDetailView(true);
            InstanceRecordView.verifyLastUpdatedDateAndTime(sharedBaseline);
          });

          // Step 6-7: open the local Instance (College), note Record last updated, edit the
          // non-mapping 591 field via quickMARC, save - Record last updated stays unchanged
          InventoryInstances.searchByTitle(testData.localInstanceId);
          InventoryInstances.selectInstanceById(testData.localInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InstanceRecordView.getLastUpdatedDateAndTime().then((localBaseline) => {
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.updateExistingField('591', testData.updatedLocalNoteContent);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InstanceRecordView.verifyLastUpdatedDateAndTime(localBaseline);
          });
        },
      );
    });
  });
});
