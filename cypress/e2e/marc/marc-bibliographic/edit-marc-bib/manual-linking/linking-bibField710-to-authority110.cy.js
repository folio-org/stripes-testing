import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
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
          browseSearchOption: 'corporateNameTitle',
          tag710: '710',
          contributor: 'C375081 Carleton University. Anthropology Caucus 2023-',
          linkedIconText: 'Linked to MARC authority',
          accordion: 'Contributor',
          bib710AfterUnlinking: [
            26,
            '710',
            '2',
            '0',
            '$a C375081 Carleton University. $b Anthropology Caucus $d 2023- $e term. $0 http://id.loc.gov/authorities/names/n93016434',
          ],
        };
        const marcFiles = [
          {
            marc: 'marcBibFileC375081.mrc',
            fileName: `testMarcFileC375081.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC375081.mrc',
            fileName: `testMarcFileC375081.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            authorityHeading: 'C375081 Carleton University.',
            propertyName: 'authority',
          },
        ];
        const createdRecordIDs = [];

        const bib710FieldValues = [
          26,
          testData.tag710,
          '2',
          '0',
          '$a C375081 University. $b School of Social Work $e term. $t test',
        ];
        const bib710AfterLinkingToAuth110 = [
          26,
          testData.tag710,
          '2',
          '0',
          '$a C375081 Carleton University. $b Anthropology Caucus $d 2023-',
          '$e term.',
          '$0 http://id.loc.gov/authorities/names/n93016434',
          '',
        ];

        before('Creating user', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375081*');

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
          'C812989 Link the "710" of "MARC Bib" field with "110" field of "MARC Authority" record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C812989'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib710FieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag710);
            MarcAuthorities.checkSearchOption(testData.browseSearchOption);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag710);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib710AfterLinkingToAuth110);
            QuickMarcEditor.pressSaveAndClose();
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
            QuickMarcEditor.checkFieldsExist([testData.tag710]);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib710AfterLinkingToAuth110);
            QuickMarcEditor.clickUnlinkIconInTagField(26);
            QuickMarcEditor.checkUnlinkModal(testData.tag710);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib710AfterUnlinking);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyContributor(2, 1, testData.contributor);
            InventoryInstance.checkMarcAppIconAbsent(2);
            InventoryInstance.viewSource();
            InventoryViewSource.notContains(testData.linkedIconText);
          },
        );
      });
    });
  });
});
