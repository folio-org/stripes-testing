import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../../../../../support/constants';
import JobProfiles from '../../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryHoldings from '../../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../../../support/fragments/settings/tenant/location-setup/locations';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          collegeHoldings: [],
          editSharedRecordText: 'Edit shared MARC record',
          linked100Field: [
            9,
            '100',
            '1',
            '\\',
            '$a Bate, Walter Jackson, $d 1918-1999',
            '',
            '$0 http://id.loc.gov/authorities/names/n79039769410818C410818',
            '',
          ],
          linked600Field_1: [
            18,
            '600',
            '1',
            '0',
            '$a Johnson, Samuel, $d 1709-1784',
            '$x Criticism and interpretation.',
            '$0 http://id.loc.gov/authorities/names/n78095825410818C410818',
            '',
          ],
          linked600Field_2: [
            19,
            '600',
            '1',
            '7',
            '$a Johnson, Samuel, $d 1709-1784',
            '',
            '$0 http://id.worldcat.org/fast/fst00029184410818C410818',
            '$2 fast',
          ],
          linked650Field: [
            20,
            '650',
            '\\',
            '7',
            '$a Criticism and interpretation',
            '',
            '$0 http://id.worldcat.org/fast/fst01198648410818C410818',
            '$2 fast',
          ],
          notLinked710Field: [
            21,
            '710',
            '\\',
            '\\',
            '$a Gálvez $0 n20114108184C410818',
          ],
        };

        const linkableFields = [100, 600, 650, 710];

        const users = {};

        const marcFiles = [
          {
            marc: 'marcBibFileForC410818-Shared.mrc',
            fileNameImported: `testMarcFileC410814.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numOfRecords: 1,
            tenant: 'Central Office',
          },
          {
            marc: 'marcAuthFileForC410818-Shared.mrc',
            fileNameImported: `testMarcFileC410814.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 4,
            tenant: 'Central Office',
          },
          {
            marc: 'marcAuthFileForC410818-Local.mrc',
            fileNameImported: `testMarcFileC410814.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 1,
            tenant: 'College',
          },
        ];

        const createdRecordIDs = [];

        before('Create users, data', () => {
          cy.getAdminToken();

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
              cy.loginAsAdmin().then(() => {
                marcFiles.forEach((marcFile) => {
                  cy.visit(TopMenu.dataImportPath);
                  if (marcFile.tenant === 'College') {
                    ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
                    DataImport.waitLoading();
                    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                  }
                  DataImport.verifyUploadState();
                  DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileNameImported);
                  JobProfiles.waitLoadingList();
                  JobProfiles.search(marcFile.jobProfileToRun);
                  JobProfiles.runImportFile();
                  JobProfiles.waitFileIsImported(marcFile.fileNameImported);
                  Logs.checkJobStatus(marcFile.fileNameImported, JOB_STATUS_NAMES.COMPLETED);
                  Logs.openFileDetails(marcFile.fileNameImported);
                  for (let i = 0; i < marcFile.numOfRecords; i++) {
                    Logs.getCreatedItemsID(i).then((link) => {
                      createdRecordIDs.push(link.split('/')[5]);
                    });
                  }
                });

                linkableFields.forEach((tag) => {
                  QuickMarcEditor.setRulesForField(tag, true);
                });
              });
            })
            .then(() => {
              // adding Holdings in College for shared Instance
                cy.setTenant(Affiliations.College);
                const collegeLocationData = Locations.getDefaultLocation({
                    servicePointId: ServicePoints.getDefaultServicePoint().id,
                }).location;
                Locations.createViaApi(collegeLocationData).then((location) => {
                    testData.collegeLocation = location;
                    InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: createdRecordIDs[0],
                    permanentLocationId: testData.collegeLocation.id,
                    }).then((holding) => {
                        testData.collegeHoldings.push(holding);
                    });
                });

              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          for (let i = 1; i < 5; i++) {
            MarcAuthority.deleteViaAPI(createdRecordIDs[i]);
          }
          cy.setTenant(Affiliations.College);
          MarcAuthority.deleteViaAPI(createdRecordIDs[5]);
          testData.collegeHoldings.forEach((holding) => {
            InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
          });
          Locations.deleteViaApi(testData.collegeLocation);
        });

        it(
          'C410818 Automated linking of Shared MARC bib (shadow MARC Instance in Member tenant) with Shared MARC authority records on Central tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkPaneheaderContains(testData.editSharedRecordText);
            
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout('Field 100, 600, and 650 has been linked to MARC authority record(s).');
            QuickMarcEditor.checkCallout('Field 710 must be set manually by selecting the link icon.');
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100Field);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_1);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_2);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked650Field);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.notLinked710Field);
            QuickMarcEditor.pressSaveAndClose();
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
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100Field);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_1);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_2);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked650Field);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.notLinked710Field);
          },
        );
      });
    });
  });
});
