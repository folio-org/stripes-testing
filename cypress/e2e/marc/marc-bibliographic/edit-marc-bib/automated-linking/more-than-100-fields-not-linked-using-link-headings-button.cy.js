import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
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
            marc: 'C388556MarcBib.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C388556MarcAuth.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 107,
            propertyName: 'authority',
          },
        ];

        const testData = {
          searchQuery: 'C388556 Disney rarities',
          errorCallout:
            'Field 650, 655, 700, 710, and 830 must be set manually by selecting the link icon.',
        };

        before('Create test data', () => {
          cy.getAdminToken();

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

          cy.getAdminToken();
          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });

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
          'C388556 More than 100 fields are NOT linked after clicking on the "Link headings" button when edit "MARC bib" (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388556'] },
          () => {
            InventoryInstances.searchByTitle(testData.searchQuery);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(2000);

            QuickMarcEditor.checkCallout(testData.errorCallout);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingField('245', '$a C388556 Disney rarities (updated)');

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.viewSource();
            InventoryViewSource.notContains('Linked to MARC authority\n\t650');
            InventoryViewSource.notContains('Linked to MARC authority\n\t655');
            InventoryViewSource.notContains('Linked to MARC authority\n\t700');
            InventoryViewSource.notContains('Linked to MARC authority\n\t710');
            InventoryViewSource.notContains('Linked to MARC authority\n\t830');

            cy.wrap(createdRecordIDs[0]).then((instanceId) => {
              cy.getInstanceLinks(instanceId).then((response) => {
                expect(response.status).to.equal(200);
                expect(response.body.totalRecords).to.equal(0);
                expect(response.body.links).to.have.length(0);
              });
            });
          },
        );
      });
    });
  });
});
