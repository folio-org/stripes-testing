import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData = {};
        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];
        const createdRecordIDs = [];

        const marcFiles = [
          {
            marc: 'C388555MarcBib.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C388555MarcAuth.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 107,
            propertyName: 'authority',
          },
        ];

        const testData = {
          searchQuery: 'C388555 Disney rarities : celebrated shorts, 1920s-1960s',
          expectedLinkedFieldsCount: 100,
          successCallout:
            'Field 650, 655, 700, 710, and 830 has been linked to MARC authority record(s).',
          errorCallout: 'Field 650 and 655 must be set manually by selecting the link icon.',
        };

        before('Create test data', () => {
          cy.getAdminToken();

          // Step 1: Delete any existing bib records with test title to remove old links
          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: `title="${testData.searchQuery}"`,
          }).then((instances) => {
            instances.forEach((instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            });
          });

          // Step 2: Delete authority records by heading prefix (C388555 test case ID prefix)
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 500,
            query: 'headingRef="C388555*"',
          }).then((records) => {
            records.forEach((record) => {
              MarcAuthority.deleteViaAPI(record.id, true);
            });
          });

          // Upload MARC fixtures
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          // Enable auto-linking for all linkable fields
          cy.getAdminToken();
          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });

          // Create user and login
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(userData.userId);
            createdRecordIDs.forEach((id, index) => {
              if (index === 0) InventoryInstance.deleteInstanceViaApi(id);
              else MarcAuthority.deleteViaAPI(id, true);
            });
          });
        });

        it(
          'C388555 More than 100 fields are linked after clicking on the "Link headings" button when edit "MARC bib" (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388555'] },
          () => {
            // Step 1: Find and open detail view of MARC Bib record
            InventoryInstances.searchByTitle(testData.searchQuery);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            // Step 2: Click on "Actions" button → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 3: Click on the "Link headings" button
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(2000);

            QuickMarcEditor.checkCallout(testData.successCallout);
            QuickMarcEditor.checkCallout(testData.errorCallout);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Step 4: Click on the "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            // Step 5: Click on "Actions" >> "View source"
            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconIsPresent(true);
            InventoryViewSource.contains('Linked to MARC authority\n\t650');
            InventoryViewSource.contains('Linked to MARC authority\n\t655');
            InventoryViewSource.contains('Linked to MARC authority\n\t700');
            InventoryViewSource.contains('Linked to MARC authority\n\t710');
            InventoryViewSource.contains('Linked to MARC authority\n\t830');

            // Step 6: Verify via API endpoint that more than 100 fields are linked
            cy.wrap(createdRecordIDs[0]).then((instanceId) => {
              cy.getInstanceLinks(instanceId).then((response) => {
                expect(response.status).to.equal(200);
                expect(response.body.totalRecords).to.be.at.least(
                  testData.expectedLinkedFieldsCount,
                );
                expect(response.body.links).to.have.length.at.least(
                  testData.expectedLinkedFieldsCount,
                );
                expect(response.body.links[0]).to.have.property('authorityId');
                expect(response.body.links[0]).to.have.property('instanceId');
                expect(response.body.links[0]).to.have.property('authorityNaturalId');
                expect(response.body.links[0]).to.have.property('linkingRuleId');
                expect(response.body.links[0].status).to.equal('ACTUAL');
              });
            });
          },
        );
      });
    });
  });
});
