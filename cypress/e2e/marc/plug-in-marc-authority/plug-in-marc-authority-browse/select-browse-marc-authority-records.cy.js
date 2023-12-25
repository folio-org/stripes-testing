import { Permissions } from '../../../../support/dictionary';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import Users from '../../../../support/fragments/users/users';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const testData = {
        tags: {
          tag700: '700',
        },
        instanceTitle: 'The data C380548',
        authTitle: 'Clovio, Giulio, 1498-1578',
        markedTitle: 'Clovio, Giulio,',
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC380548.mrc',
            fileName: `testMarcFileBibC380548.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numberOfRecords: 1,
          },
          {
            marc: 'marcAuthC380548.mrc',
            fileName: `testMarcFileAuthC380548.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numberOfRecords: 1,
          },
        ],
      };

      before('Creating user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: `title="${testData.instanceTitle}"`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
        });
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading })
          .then(() => {
            testData.marcFiles.forEach((marcFile) => {
              DataImport.verifyUploadState();
              DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              JobProfiles.waitFileIsImported(marcFile.fileName);
              Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
              Logs.openFileDetails(marcFile.fileName);
              for (let i = 0; i < marcFile.numberOfRecords; i++) {
                Logs.getCreatedItemsID(i).then((link) => {
                  if (marcFile.jobProfileToRun === 'Default - Create instance and SRS MARC Bib') {
                    testData.instanceIDs.push(link.split('/')[5]);
                  } else {
                    testData.authorityIDs.push(link.split('/')[5]);
                  }
                });
              }
              cy.visit(TopMenu.dataImportPath);
            });
          })
          .then(() => {
            cy.logout();
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(testData.instanceTitle);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag700);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
          });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        testData.authorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C380548 MARC Authority plug-in | Select "Browse" MARC authority records (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.verifyBrowseAuthorityPane('Personal name', 'Dugmore, C. W.');

          MarcAuthorityBrowse.checkSearchOptions();

          MarcAuthorityBrowse.searchBy('Personal name', testData.authTitle);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkColumnExists('Link');
          MarcAuthorities.checkColumnExists('Authorized/Reference');
          MarcAuthorities.checkColumnExists('Heading/Reference');
          MarcAuthorities.checkColumnExists('Type of heading');

          MarcAuthorities.checkColumnExists('Authority source');
          MarcAuthorities.verifyAllAuthorizedAreBold('Authorized');
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Authorized/Reference',
            expectedValues: ['Authorized', 'Reference'],
            browsePane: true,
          });
          MarcAuthorities.verifyAllAuthorizedHaveLinks();

          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('');

          MarcAuthorities.verifyPagination();

          MarcAuthoritiesSearch.selectExcludeReferencesFilter();
          MarcAuthorities.selectItem(testData.authTitle);
          MarcAuthority.waitLoading();
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedTitle);

          MarcAuthorities.verifyLinkButtonExistOnMarcViewPane();
          MarcAuthority.verifyHeader(testData.authTitle);

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          MarcAuthorities.closeFindAuthorityModal();
          QuickMarcEditor.waitLoading();
        },
      );
    });
  });
});
