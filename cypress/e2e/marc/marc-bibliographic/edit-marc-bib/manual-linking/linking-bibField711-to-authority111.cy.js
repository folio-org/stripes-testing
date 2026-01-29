import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
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
          browseSearchOption: 'corporateNameTitle',
          tag711: '711',
          contributor: 'C375082 Mostly Mozart Festival. sonet',
          linkedIconText: 'Linked to MARC authority',
          accordion: 'Contributor',
          bib711AfterUnlinking: [
            29,
            '711',
            '2',
            '\\',
            '$a C375082 Mostly Mozart Festival. $e Orchestra $t sonet $v version 1 $0 http://id.loc.gov/authorities/names/n81142344 $4 prf',
          ],
        };
        const marcFiles = [
          {
            marc: 'marcBibFileC375082.mrc',
            fileName: `testMarcFileC375082.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC375082.mrc',
            fileName: `testMarcFileC375082.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            searchOption: 'Name-title',
            authorityHeading: 'C375082 Mostly Mozart Festival.',
            propertyName: 'authority',
          },
        ];
        const createdRecordIDs = [];

        const bib711FieldValues = [
          29,
          testData.tag711,
          '2',
          '\\',
          '$a C375082 Mostly Festival. $e Orch. $4 prf $v version 1',
        ];
        const bib711AfterLinkingToAuth111 = [
          29,
          testData.tag711,
          '2',
          '\\',
          '$a C375082 Mostly Mozart Festival. $e Orchestra $t sonet',
          '$v version 1',
          '$0 http://id.loc.gov/authorities/names/n81142344',
          '$4 prf',
        ];

        before('Creating user', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375082*');

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
              authRefresh: true,
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
          'C375082 Link the "711" of "MARC Bib" field with "111" field of "MARC Authority" record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C375082'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib711FieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag711);
            MarcAuthorities.checkSearchOption(testData.browseSearchOption);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorityBrowse.searchBy(marcFiles[1].searchOption, marcFiles[1].authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag711);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib711AfterLinkingToAuth111);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.accordion,
              `${testData.linkedIconText}\n${testData.contributor}`,
            );
            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkRecordDetailPageMarkedValue(marcFiles[1].authorityHeading);
            InventoryInstance.goToPreviousPage();
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();
            InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkDetailViewIncludesText(marcFiles[1].authorityHeading);
            InventoryInstance.goToPreviousPage();
            InventoryViewSource.waitLoading();
            InventoryViewSource.close();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyInstancePaneExists();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkFieldsExist([testData.tag711]);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib711AfterLinkingToAuth111);
            QuickMarcEditor.clickUnlinkIconInTagField(29);
            QuickMarcEditor.checkUnlinkModal(testData.tag711);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib711AfterUnlinking);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyContributor(5, 1, testData.contributor);
            InventoryInstance.checkMarcAppIconAbsent(5);
            InventoryInstance.viewSource();
            InventoryViewSource.notContains(testData.linkedIconText);
          },
        );
      });
    });
  });
});
