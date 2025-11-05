import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
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
          tag700: '700',
          instanceField700Value: 'C380461 Stelfreeze, Brian 2nd, 1901 2100 Panther Black',
          errorMessage:
            'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
        };

        const linkValuesWithoutAuthoritySource = [
          {
            value: 'C380461 Catalonia (Spain). Mozos de Escuadra',
            searchOption: 'Corporate/Conference name',
          },
          {
            value: 'C380461 United States. Truth in Lending Act',
            searchOption: 'Name-title',
          },
          {
            value: 'C380461 Western Region Research Conference in Agricultural Education',
            searchOption: 'Corporate/Conference name',
          },
          {
            value:
              'C380461 Geophysical Symposium (21st : 1976 : Leipzig, Germany) Proceedings. Selections',
            searchOption: 'Name-title',
          },
          {
            value: 'C380461 Marvel comics',
            searchOption: 'Uniform title',
          },
        ];

        const linkValuesWithAuthoritySource = [
          {
            value: 'C380461 Montessori method of education',
            searchOption: 'Subject',
            authoritySource: String.raw`LC Children's Subject Headings`,
          },
          {
            value: 'C380461 Gulf Stream',
            searchOption: 'Geographic name',
            authoritySource: 'LC Subject Headings (LCSH)',
          },
          {
            value: 'C380461 Peplum films',
            searchOption: 'Genre',
            authoritySource: 'LC Genre/Form Terms (LCGFT)',
          },
        ];

        const marcFiles = [
          {
            marc: 'marcBibFileForC380461.mrc',
            fileName: `testMarcFileC380461.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC380461.mrc',
            fileName: `testMarcFileC380461.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 10,
            propertyName: 'authority',
          },
        ];

        const bib700FieldValues = [
          74,
          testData.tag700,
          '1',
          '\\',
          '$a C380461 Stelfreeze, $a Brian 2nd, $d 1901 $d 2100 $t Panther $t Black $e artist.',
        ];

        const createdRecordIDs = [];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380461*');

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
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id, true);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C380461 Verify that user cant link "700" MARC Bib field with wrong record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C380461'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib700FieldValues);
            InventoryInstance.verifyAndClickLinkIconByIndex(bib700FieldValues[0]);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.checkSearchOption('nameTitle');
            MarcAuthorities.checkSearchInput(testData.instanceField700Value);
            MarcAuthorities.verifyEmptyAuthorityField();
            linkValuesWithoutAuthoritySource.forEach((linkValue) => {
              MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
              MarcAuthorities.checkRow(linkValue.value);
              MarcAuthorities.selectTitle(linkValue.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              QuickMarcEditor.closeAllCallouts();
              InventoryInstance.verifySelectMarcAuthorityModal();
            });

            linkValuesWithAuthoritySource.forEach((linkValue) => {
              MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
              MarcAuthorities.chooseAuthoritySourceOption(linkValue.authoritySource);
              MarcAuthorities.selectTitle(linkValue.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              QuickMarcEditor.closeAllCallouts();
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.closeAuthoritySourceOption();
            });
          },
        );
      });
    });
  });
});
