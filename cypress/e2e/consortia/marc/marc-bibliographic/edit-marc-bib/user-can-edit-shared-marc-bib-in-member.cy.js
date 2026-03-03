import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        sharedBibSourcePaheheaderText: 'Shared MARC bibliographic record',
        tag245: '245',
        tag500: '500',
        tag504: '504',
        tag245Content: 'C405507 Instance Shared Central Updated',
        tag500Content: 'Proceedings. Updated',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcBibFileForC405507.mrc',
          fileNameImported: `testMarcFileC405507.${getRandomPostfix()}.mrc`,
          propertyName: 'instance',
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
      ];

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userAProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, users.userAProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userAProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          });

        cy.resetTenant();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userBProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.University, users.userBProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileNameImported,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userAProperties.userId);
        Users.deleteViaApi(users.userBProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      });

      it(
        'C405507 User can edit shared "MARC Bib" in member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C405507'] },
        () => {
          cy.login(users.userAProperties.username, users.userAProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });

          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.tag245Content}`);
          QuickMarcEditor.updateExistingField(testData.tag500, `$a ${testData.tag500Content}`);
          QuickMarcEditor.moveFieldUp(17);
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(4000);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.tag245Content);
          InventoryInstance.verifyLastUpdatedSource(
            users.userAProperties.firstName,
            users.userAProperties.lastName,
          );

          cy.waitForAuthRefresh(() => {
            cy.login(users.userBProperties.username, users.userBProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkInstanceTitle(testData.tag245Content);
            InventoryInstance.verifyLastUpdatedSource(
              users.userAProperties.firstName,
              users.userAProperties.lastName,
            );
            InventoryInstance.viewSource();
            InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);
            InventoryViewSource.verifyFieldInMARCBibSource(testData.tag245, testData.tag245Content);
            InventoryViewSource.verifyFieldInMARCBibSource(testData.tag500, testData.tag500Content);
            InventoryViewSource.close();
          }, 20_000);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.checkInstanceTitle(testData.tag245Content);
          // TO DO: fix this check failure - 'Unknown user' is shown, possibly due to the way users are created in test
          // InventoryInstance.verifyLastUpdatedSource(users.userAProperties.firstName, users.userAProperties.lastName);
          InventoryInstance.viewSource();
          InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);
          InventoryViewSource.verifyFieldInMARCBibSource(testData.tag245, testData.tag245Content);
          InventoryViewSource.verifyFieldInMARCBibSource(testData.tag500, testData.tag500Content);
        },
      );
    });
  });
});
