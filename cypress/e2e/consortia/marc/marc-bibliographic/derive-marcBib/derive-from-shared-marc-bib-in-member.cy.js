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
        tag245DerivedContent: '$a C402769 The Riviera house (derived record) / $c Natasha Lester.',
        tag245EditedContent:
          '$a C402769 The Riviera house (derived and edited record) / $c Natasha Lester.',
        instanceTitle: 'C402769 The Riviera house / Natasha Lester.',
        instanceDerivedTitle: 'C402769 The Riviera house (derived record) / Natasha Lester.',
        instanceEditedTitle:
          'C402769 The Riviera house (derived and edited record) / Natasha Lester.',
        deriveLocalPaneheaderText: 'Derive a new local MARC bib record',
        sourceViewLocalText: 'Local MARC bibliographic record',
      };

      const marcFile = {
        marc: 'marcBibFileC402769.mrc',
        fileNameImported: `testMarcFileC402769.${getRandomPostfix()}.mrc`,
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
            cy.resetTenant();
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
            cy.waitForAuthRefresh(() => {
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            }, 20_000).then(() => {
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            });
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceIDs[0]);
        cy.setTenant(Affiliations.University);
        InventoryInstance.deleteInstanceViaApi(createdInstanceIDs[1]);
      });

      it(
        'C402769 Derive new Local MARC bib record from Shared Instance in Member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C402769'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.checkPresentedText(testData.instanceTitle);

          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkPaneheaderContains(testData.deriveLocalPaneheaderText);
          QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245DerivedContent);
          QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245DerivedContent);
          QuickMarcEditor.pressSaveAndCloseButton();
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
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkSharedTextInDetailView(false);
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.checkPresentedText(testData.instanceEditedTitle);

            InventoryInstance.viewSource();
            InventoryViewSource.contains(testData.tag245EditedContent);
            InventoryViewSource.contains(testData.sourceViewLocalText);

            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            InventoryInstances.searchByTitle(createdInstanceIDs[1], false);
            InventorySearchAndFilter.verifyNoRecordsFound();

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
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
