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
          tag240: '240',
          instanceField240Value: 'C380453 Laws, etc. 1995 Fish and Game Code',
          errorMessage:
            'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
        };

        const linkValuesWithoutAuthoritySource = [
          {
            value: 'C380453 Stone, Robert B.',
            searchOption: 'Personal name',
          },
          {
            value: 'C380453 Catalonia (Spain). Mozos de Escuadra',
            searchOption: 'Corporate/Conference name',
          },
          {
            value: 'C380453 Western Region Research Conference in Agricultural Education',
            searchOption: 'Corporate/Conference name',
          },
        ];

        const linkValuesWithAuthoritySource = [
          {
            value: 'C380453 Marvel comics',
            searchOption: 'Uniform title',
            authoritySource: 'LC Name Authority file (LCNAF)',
          },
          {
            value: 'C380453 Montessori method of education',
            searchOption: 'Subject',
            authoritySource: String.raw`LC Children's Subject Headings`,
          },
          {
            value: 'C380453 Gulf Stream',
            searchOption: 'Geographic name',
            authoritySource: 'LC Subject Headings (LCSH)',
          },
          {
            value: 'C380453 Peplum films',
            searchOption: 'Genre',
            authoritySource: 'LC Genre/Form Terms (LCGFT)',
          },
        ];

        const marcFiles = [
          {
            marc: 'marcBibFileForC380453.mrc',
            fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC380453.mrc',
            fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 10,
            propertyName: 'authority',
          },
        ];

        const bib240FieldValues = [
          11,
          testData.tag240,
          '1',
          '0',
          '$a C380453 Laws, etc. $d 1995 $t Fish and Game Code $p test $2 ptf',
        ];

        const createdRecordIDs = [];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380453*');

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
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C380453 Verify that user cant link "240" MARC Bib field with wrong record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C380453'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240FieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.checkSearchOption('nameTitle');
            MarcAuthorities.checkSearchInput(testData.instanceField240Value);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySearchOptions();
            MarcAuthorities.checkSearchOption('nameTitle');
            MarcAuthorities.checkSearchInput('');
            MarcAuthorities.verifyEmptyAuthorityField();
            linkValuesWithoutAuthoritySource.forEach((linkValue) => {
              MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              InventoryInstance.verifySelectMarcAuthorityModal();
            });

            linkValuesWithAuthoritySource.forEach((linkValue) => {
              MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
              MarcAuthorities.chooseAuthoritySourceOption(linkValue.authoritySource);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.closeAuthoritySourceOption();
            });
          },
        );
      });
    });
  });
});
