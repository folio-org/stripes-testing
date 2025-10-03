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
            '$a C410818 Bate, Walter Jackson, $d 1918-1999',
            '',
            '$0 http://id.loc.gov/authorities/names/n79039769410818C410818',
            '',
          ],
          linked600Field_1: [
            18,
            '600',
            '1',
            '0',
            '$a C410818 Johnson, Samuel, $d 1709-1784',
            '',
            '$0 http://id.loc.gov/authorities/names/n78095825410818C410818',
            '',
          ],
          linked600Field_2: [
            19,
            '600',
            '1',
            '7',
            '$a C410818 Johnson, Samuel, $d 1709-1784',
            '',
            '$0 http://id.worldcat.org/fast/fst00029184410818C410818',
            '$2 fast',
          ],
          linked650Field: [
            20,
            '650',
            '\\',
            '7',
            '$a C410818 Criticism and interpretation',
            '',
            '$0 http://id.worldcat.org/fast/fst01198648410818C410818',
            '$2 fast',
          ],
          notLinked710Field: [21, '710', '\\', '\\', '$a Gálvez $0 n20114108184C410818'],
        };

        const linkableFields = [100, 600, 650, 710];

        const users = {};

        const marcFiles = [
          {
            marc: 'marcBibFileForC410818-Shared.mrc',
            fileNameImported: `testMarcFileC410818.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
            tenant: 'Central Office',
          },
          {
            marc: 'marcAuthFileForC410818-Shared.mrc',
            fileNameImported: `testMarcFileC410818.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 4,
            propertyName: 'authority',
            tenant: 'Central Office',
          },
          {
            marc: 'marcAuthFileForC410818-Local.mrc',
            fileNameImported: `testMarcFileC410818.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
            tenant: 'College',
          },
        ];

        const createdRecordIDs = [];

        before('Create users, data', () => {
          cy.getAdminToken();
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="C410818" and (authRefType==("Authorized" or "Auth/Ref"))',
          }).then((authorities) => {
            if (authorities) {
              authorities.forEach(({ id }) => {
                MarcAuthority.deleteViaAPI(id, true);
              });
            }
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
              marcFiles.forEach((marcFile) => {
                if (marcFile.tenant === 'College') {
                  cy.setTenant(Affiliations.College);
                } else {
                  cy.resetTenant();
                  cy.getAdminToken();
                }
                DataImport.uploadFileViaApi(
                  marcFile.marc,
                  marcFile.fileNameImported,
                  marcFile.jobProfileToRun,
                ).then((response) => {
                  response.forEach((record) => {
                    createdRecordIDs.push(record[marcFile.propertyName].id);
                  });
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
                InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
                  (holdingSources) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: createdRecordIDs[0],
                      permanentLocationId: testData.collegeLocation.id,
                      sourceId: holdingSources[0].id,
                    }).then((holding) => {
                      testData.collegeHoldings.push(holding);
                    });
                  },
                );
              });
              cy.resetTenant();
              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          createdRecordIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          cy.setTenant(Affiliations.College);
          createdRecordIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          testData.collegeHoldings.forEach((holding) => {
            InventoryHoldings.deleteHoldingRecordViaApi(holding.id);
          });
          Locations.deleteViaApi(testData.collegeLocation);
        });

        it(
          'C410818 Automated linking of Shared MARC bib (shadow MARC Instance in Member tenant) with Shared MARC authority records on Central tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C410818'] },
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
            QuickMarcEditor.checkCallout(
              'Field 710 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100Field);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_1);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked600Field_2);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked650Field);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.notLinked710Field);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(4000);
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
