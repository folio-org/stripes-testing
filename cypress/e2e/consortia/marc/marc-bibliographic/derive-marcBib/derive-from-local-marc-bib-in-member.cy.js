import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag245: '245',
        tag245DerivedContent:
          '$a C402770 The other side of paradise (derived record): $b a memoir / $c Staceyann Chin.',
        tag245EditedContent:
          '$a C402770 The other side of paradise (derived and edited record): $b a memoir / $c Staceyann Chin.',
        instanceTitle: 'C402770 The other side of paradise : a memoir / Staceyann Chin.',
        instanceDerivedTitle:
          'C402770 The other side of paradise (derived record): a memoir / Staceyann Chin.',
        instanceEditedTitle:
          'C402770 The other side of paradise (derived and edited record): a memoir / Staceyann Chin.',
        deriveLocalPaneheaderText: 'Derive a new local MARC bib record',
        sourceViewLocalText: 'Local MARC bibliographic record',
        heldbyAccordionName: 'Held by',
      };

      const marcFile = {
        marc: 'marcBibFileC402770.mrc',
        fileNameImported: `testMarcFileC402770.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };

      const users = {};

      const createdInstanceIDs = [];

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.University);
            cy.wait(10_000);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.College);

            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileNameImported,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdInstanceIDs.push(record.instance.id);
              });
            });

            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        cy.setTenant(Affiliations.College);
        createdInstanceIDs.forEach((instanceID) => {
          InventoryInstance.deleteInstanceViaApi(instanceID);
        });
      });

      it(
        'C402770 Derive new Local MARC bib record from Local Instance in Member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C402770'] },
        () => {
          cy.visit(`${TopMenu.inventoryPath}/view/${createdInstanceIDs[0]}`);
          InventoryInstance.waitLoading();
          InventoryInstance.checkPresentedText(testData.instanceTitle);
          InventoryInstance.checkSharedTextInDetailView(false);

          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkPaneheaderContains(testData.deriveLocalPaneheaderText);
          QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245DerivedContent);
          QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245DerivedContent);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkSharedTextInDetailView(false);
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.checkPresentedText(testData.instanceDerivedTitle);
          InventoryInstance.getId().then((id) => {
            createdInstanceIDs.push(id);

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245DerivedContent);
            QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245EditedContent);
            QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245EditedContent);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkSharedTextInDetailView(false);
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.checkPresentedText(testData.instanceEditedTitle);

            InventoryInstance.viewSource();
            InventoryViewSource.contains(testData.tag245EditedContent);
            InventoryViewSource.contains(testData.sourceViewLocalText);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

            InventorySearchAndFilter.clearDefaultFilter(testData.heldbyAccordionName);
            InventoryInstances.searchByTitle(createdInstanceIDs[1], false);
            InventorySearchAndFilter.verifyNoRecordsFound();

            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            InventoryInstances.searchByTitle(createdInstanceIDs[1], false);
            InventorySearchAndFilter.verifyNoRecordsFound();
          });
        },
      );
    });
  });
});
