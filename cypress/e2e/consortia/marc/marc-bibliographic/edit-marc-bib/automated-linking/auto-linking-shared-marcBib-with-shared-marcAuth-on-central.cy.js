import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../../support/constants';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          editSharedRecordText: 'Edit shared MARC record',
          searchQueries: [
            'Bate, Walter Jackson,',
            'Johnson, Samuel,',
            'Criticism and interpretation',
          ],
          linked100Field: [
            9,
            '100',
            '1',
            '\\',
            '$a Bate, Walter Jackson, $d 1918-1999',
            '',
            '$0 http://id.loc.gov/authorities/names/n79039769C400663',
            '',
          ],
          linked600Field_1: [
            18,
            '600',
            '1',
            '0',
            '$a Johnson, Samuel, $d 1709-1784',
            '',
            '$0 http://id.loc.gov/authorities/names/n78095825C400663',
            '',
          ],
          linked600Field_2: [
            19,
            '600',
            '1',
            '7',
            '$a Johnson, Samuel, $d 1709-1784',
            '',
            '$0 http://id.worldcat.org/fast/fst00029184C400663',
            '$2 fast',
          ],
          linked650Field: [
            20,
            '650',
            '\\',
            '7',
            '$a Criticism and interpretation',
            '',
            '$0 http://id.worldcat.org/fast/fst01198648C400663',
            '$2 fast',
          ],
        };

        const linkableFields = [100, 600, 650];

        const users = {};

        const marcFiles = [
          {
            marc: 'marcBibFileForC400663.mrc',
            fileNameImported: `testMarcFileC410814.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC400663.mrc',
            fileNameImported: `testMarcFileC410814.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
            numOfRecords: 4,
          },
        ];

        const createdRecordIDs = [];

        before('Create users, data', () => {
          cy.getAdminToken();
          testData.searchQueries.forEach((query) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
            }).then((authorities) => {
              if (authorities) {
                authorities.forEach(({ id }) => {
                  MarcAuthority.deleteViaAPI(id);
                });
              }
            });
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ])
            .then((userProperties) => {
              users.userProperties = userProperties;
            })
            .then(() => {
              cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]);
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken().then(() => {
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

                linkableFields.forEach((tag) => {
                  QuickMarcEditor.setRulesForField(tag, true);
                });

                cy.login(users.userProperties.username, users.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                  authRefresh: true,
                });
              });
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C400663 Automated linking of Shared MARC bib with Shared MARC authority records on Central tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C400663'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkPaneheaderContains(testData.editSharedRecordText);
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 100, 600, and 650 has been linked to MARC authority record(s).',
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100Field);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_1);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_2);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked650Field);
            QuickMarcEditor.deleteField(4);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(2500);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(2500);
            QuickMarcEditor.confirmDelete();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkExpectedMARCSource();

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkPaneheaderContains(testData.editSharedRecordText);

            testData.linked100Field[0]--;
            testData.linked600Field_1[0]--;
            testData.linked600Field_2[0]--;
            testData.linked650Field[0]--;

            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100Field);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_1);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_2);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked650Field);
          },
        );
      });
    });
  });
});
