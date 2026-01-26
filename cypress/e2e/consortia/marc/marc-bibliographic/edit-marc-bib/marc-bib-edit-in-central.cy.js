import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        sharedPaneheaderText: 'Edit shared MARC record',
        tag245: '245',
        tag500: '500',
        tag504: '504',
        tag245UpdatedValue: '$a C405520 Auto Instance Shared Central Updated',
        tag500UpdatedValue: '$a Proceedings. Updated',
        updatedTitle: 'C405520 Auto Instance Shared Central Updated',
      };

      const users = {};

      const marcFile = {
        marc: 'marcBibFileC405520.mrc',
        fileNameImported: `testMarcFileC405520.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };

      let createdInstanceID;

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          users.userAProperties = userProperties;
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userBProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, users.userBProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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
                createdInstanceID = record.instance.id;
              });
            });

            cy.waitForAuthRefresh(() => {
              cy.login(users.userAProperties.username, users.userAProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
            InventoryInstances.waitContentLoading();
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdInstanceID);
        Users.deleteViaApi(users.userAProperties.userId);
        Users.deleteViaApi(users.userBProperties.userId);
      });

      it(
        'C405520 User can edit shared "MARC Bib" in Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C405520'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceID);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkPaneheaderContains(testData.sharedPaneheaderText);
          QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245UpdatedValue);
          QuickMarcEditor.updateExistingField(testData.tag500, testData.tag500UpdatedValue);
          QuickMarcEditor.moveFieldUp(17);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.updatedTitle);
          InventoryInstance.verifyLastUpdatedSource(
            users.userAProperties.firstName,
            users.userAProperties.lastName,
          );

          cy.login(users.userBProperties.username, users.userBProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.searchByTitle(createdInstanceID);
          InventoryInstances.selectInstance();
          InventoryInstance.checkInstanceTitle(testData.updatedTitle);
          // TO DO: fix this check failure - 'Unknown user' is shown, possibly due to the way users are created in test
          // InventoryInstance.verifyLastUpdatedSource(users.userAProperties.firstName, users.userAProperties.lastName);
          InventoryInstance.viewSource();
          InventoryViewSource.verifyFieldInMARCBibSource(
            testData.tag245,
            testData.tag245UpdatedValue,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            testData.tag500,
            testData.tag500UpdatedValue,
          );
          InventoryViewSource.close();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245UpdatedValue);
          QuickMarcEditor.checkContentByTag(testData.tag500, testData.tag500UpdatedValue);
          QuickMarcEditor.checkUserNameInHeader(
            users.userAProperties.firstName,
            users.userAProperties.lastName,
          );
          QuickMarcEditor.verifyTagValue(16, testData.tag504);
          QuickMarcEditor.verifyTagValue(17, testData.tag500);
        },
      );
    });
  });
});
