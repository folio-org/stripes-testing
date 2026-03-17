import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import { Permissions } from '../../../../../support/dictionary';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
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
      describe('Manual linking', () => {
        const testData = {
          browseSearchOption: 'personalNameTitle',
          tag800: '800',
          authorityMarkedValue: 'C375084 Robinson, Peter,',
          seriesStatementValue: 'C375084 Robinson, Peter, 1950-2022 Inspector Banks series ; 24.',
          authorityIconText: 'Linked to MARC authority',
          accordion: 'Title data',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC375084.mrc',
            fileName: `testMarcBibFileC375071.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC375084.mrc',
            fileName: `testMarcAuthFileC375071.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            authorityHeading: 'C375084 Robinson, Peter',
            propertyName: 'authority',
          },
        ];

        const createdRecordIDs = [];
        const bib800InitialFieldValues = [
          35,
          testData.tag800,
          '1',
          '\\',
          '$a C375084 Robinson, P, $d 1950- $v 24. $y 2023 $8 800',
        ];
        const bib800UnlinkedFieldValues = [
          35,
          testData.tag800,
          '1',
          '\\',
          '$a C375084 Robinson, Peter, $d 1950-2022 $c Inspector Banks series ; $v 24. $y 2023 $0 3052044 $8 800',
        ];
        const bib800LinkedFieldValues = [
          35,
          testData.tag800,
          '1',
          '\\',
          '$a C375084 Robinson, Peter, $d 1950-2022 $c Inspector Banks series ;',
          '$v 24. $y 2023',
          '$0 3052044',
          '$8 800',
        ];

        before('Creating user', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375084');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

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

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created user', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C375084 Link the "800" of "MARC Bib" field with "100" field of "MARC Authority" record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C375084'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib800InitialFieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag800);
            MarcAuthorities.checkSearchOption(testData.browseSearchOption);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthority.contains(`\t$a ${marcFiles[1].authorityHeading}`);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag800);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib800LinkedFieldValues);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifySeriesStatement(
              0,
              `${testData.authorityIconText}${testData.seriesStatementValue}`,
            );
            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(testData.accordion);
            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityMarkedValue);
            InventoryInstance.goToPreviousPage();
            // Wait for the content to be loaded.
            cy.wait(6000);
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();
            InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityMarkedValue);
            InventoryInstance.goToPreviousPage();
            // Wait for the content to be loaded.
            cy.wait(6000);
            InventoryViewSource.waitLoading();
            InventoryViewSource.close();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyInstancePaneExists();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib800LinkedFieldValues);
            QuickMarcEditor.clickUnlinkIconInTagField(bib800UnlinkedFieldValues[0]);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib800UnlinkedFieldValues);
            QuickMarcEditor.verifyIconsAfterUnlinking(bib800UnlinkedFieldValues[0]);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
            InventoryInstance.viewSource();
            InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
          },
        );
      });
    });
  });
});
